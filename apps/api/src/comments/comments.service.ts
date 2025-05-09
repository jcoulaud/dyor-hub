import {
  CommentMentionData,
  LatestComment,
  NotificationEventType,
  NotificationType,
  PaginatedLatestCommentsResponse,
  UpdateCommentDto,
  VoteType,
} from '@dyor-hub/types';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import * as cheerio from 'cheerio';
import { In, IsNull, Repository } from 'typeorm';
import { CommentVoteEntity } from '../entities/comment-vote.entity';
import { CommentEntity } from '../entities/comment.entity';
import { TokenEntity } from '../entities/token.entity';
import { UserFollows } from '../entities/user-follows.entity';
import { UserEntity } from '../entities/user.entity';
import { GamificationEvent } from '../gamification/services/activity-hooks.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PerspectiveService } from '../services/perspective.service';
import { TelegramAdminService } from '../telegram/admin/telegram-admin.service';
import { UploadsService } from '../uploads/uploads.service';
import { CommentResponseDto } from './dto/comment-response.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { VoteResponseDto } from './dto/vote-response.dto';

const TEMP_PREFIX = 'images/temp-uploads/';

@Injectable()
export class CommentsService {
  // Edit window duration for a comment
  private readonly EDIT_WINDOW_MS = 15 * 60 * 1000;
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    @InjectRepository(CommentVoteEntity)
    private readonly voteRepository: Repository<CommentVoteEntity>,
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserFollows)
    private readonly userFollowsRepository: Repository<UserFollows>,
    private readonly perspectiveService: PerspectiveService,
    private readonly telegramAdminService: TelegramAdminService,
    private readonly eventEmitter: EventEmitter2,
    private readonly uploadsService: UploadsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // --- Helper Function to Process HTML for Images ---
  private async processCommentContentForImages(
    htmlContent: string,
  ): Promise<string> {
    if (!htmlContent || !htmlContent.includes('data-s3-key')) {
      return htmlContent;
    }

    const $ = cheerio.load(htmlContent);
    const imageProcessingPromises: Promise<void>[] = [];
    const tempKeysToConfirm = new Map<string, Promise<string>>();
    let processingError: Error | null = null;

    $('img[data-s3-key]').each((index, element) => {
      const img = $(element);
      const tempKey = img.attr('data-s3-key');

      if (tempKey && tempKey.startsWith(TEMP_PREFIX)) {
        if (!tempKeysToConfirm.has(tempKey)) {
          tempKeysToConfirm.set(
            tempKey,
            this.uploadsService.confirmUpload(tempKey),
          );
        }

        imageProcessingPromises.push(
          (async () => {
            try {
              const permanentUrl = await tempKeysToConfirm.get(tempKey)!;
              img.attr('src', permanentUrl);
              img.removeAttr('data-s3-key');
              img.removeAttr('data-upload-id');
            } catch (error) {
              if (!processingError || error instanceof ForbiddenException) {
                processingError = error;
              }
              img.attr('alt', '[Image upload failed to confirm]');
            }
          })(),
        );
      }
    });

    await Promise.allSettled(imageProcessingPromises);

    if (processingError) {
      throw processingError;
    }

    return $('body').html() || '';
  }

  // Helper function to extract plain text from HTML
  private extractPlainText(html: string): string {
    try {
      const $ = cheerio.load(html);
      return $('*').text();
    } catch (error) {
      this.logger.warn(
        `Error parsing HTML for plain text extraction: ${error}`,
      );
      return '';
    }
  }

  // Helper function to extract mention usernames from text
  private extractMentions(text: string): string[] {
    const mentionRegex = /@([a-zA-Z0-9_]{3,30})/g; // Regex for @username (adjust length as needed)
    const matches = text.match(mentionRegex);
    if (!matches) {
      return [];
    }
    // Extract usernames without the '@'
    return matches.map((mention) => mention.substring(1));
  }

  async findByTokenMintAddress(
    tokenMintAddress: string,
    currentUserId?: string,
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'best',
  ): Promise<{
    data: CommentResponseDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    try {
      // 1. Fetch Paginated Root Comments
      const rootCommentQueryBase = this.commentRepository
        .createQueryBuilder('comment')
        .where('comment.tokenMintAddress = :tokenMintAddress', {
          tokenMintAddress,
        })
        .andWhere('comment.parentId IS NULL'); // Fetch only root comments

      // Get total count of ROOT comments for pagination meta
      const totalRootComments = await rootCommentQueryBase.getCount();

      // Clone base query for fetching data
      const rootCommentQuery = rootCommentQueryBase
        .clone()
        .leftJoinAndSelect('comment.user', 'user')
        .leftJoin('comment.tokenCall', 'tokenCall')
        .select([
          'comment',
          'user.id',
          'user.username',
          'user.displayName',
          'user.avatarUrl',
          'tokenCall.id',
          'tokenCall.targetPrice',
          'tokenCall.targetDate',
          'tokenCall.status',
          'tokenCall.referencePrice',
          'tokenCall.referenceSupply',
        ]);

      // Apply sorting for root comments
      let orderByClause: { [key: string]: 'ASC' | 'DESC' } = {};
      let sortInMemory = false;
      if (sortBy === 'new') {
        orderByClause = { 'comment.createdAt': 'DESC' };
      } else if (sortBy === 'old') {
        orderByClause = { 'comment.createdAt': 'ASC' };
      } else {
        // For 'best' and 'controversial', we fetch by creation date first
        // and then sort the final list in memory
        orderByClause = { 'comment.createdAt': 'DESC' };
        sortInMemory = true;
      }
      Object.keys(orderByClause).forEach((key) => {
        rootCommentQuery.addOrderBy(key, orderByClause[key]);
      });

      // Apply pagination to root comment query
      rootCommentQuery.skip((page - 1) * limit).take(limit);

      const rootComments = await rootCommentQuery.getMany();

      if (rootComments.length === 0) {
        return {
          data: [],
          meta: {
            total: totalRootComments,
            page,
            limit,
            totalPages: Math.ceil(totalRootComments / limit),
          },
        };
      }

      const rootCommentIds = rootComments.map((c) => c.id);

      // 2. Fetch All Descendants for these Root Comments
      const recursiveQuery = `
        WITH RECURSIVE comment_tree AS (
          -- Anchor member: Direct children of the root comments on the current page
          SELECT
            c.*,
            1 as depth
          FROM comments c
          WHERE c."parent_id" = ANY($1)

          UNION ALL

          -- Recursive member: Children of comments already in the tree
          SELECT
            c.*,
            ct.depth + 1
          FROM comments c
          JOIN comment_tree ct ON c."parent_id" = ct.id
          WHERE ct.depth < 10 -- Limit recursion depth for safety
        )
        SELECT id FROM comment_tree;
      `;

      // Execute the raw recursive query to get all descendant IDs
      const descendantIdsResult = await this.commentRepository.query(
        recursiveQuery,
        [rootCommentIds],
      );
      const descendantIds = descendantIdsResult.map((r) => r.id);

      let allComments: CommentEntity[] = [...rootComments];

      // Fetch descendant entities if any exist
      if (descendantIds.length > 0) {
        const descendants = await this.commentRepository.find({
          where: { id: In(descendantIds) },
          relations: ['user', 'removedBy', 'tokenCall'],
          select: {
            id: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            upvotes: true,
            downvotes: true,
            parentId: true,
            userId: true,
            tokenMintAddress: true,
            removedById: true,
            isEdited: true,
            type: true,
            tokenCallId: true,
            user: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
            removedBy: {
              id: true,
            },
            tokenCall: {
              id: true,
              targetPrice: true,
              targetDate: true,
              status: true,
              referencePrice: true,
              referenceSupply: true,
            },
          },
        });
        allComments = [...rootComments, ...descendants];
      }

      const allCommentIds = allComments.map((c) => c.id);

      // 3. Fetch User Votes for all involved comments
      const userVotesMap = new Map<string, VoteType>();
      if (currentUserId && allCommentIds.length > 0) {
        const votes = await this.voteRepository.find({
          where: { userId: currentUserId, commentId: In(allCommentIds) },
        });
        votes.forEach((v) => userVotesMap.set(v.commentId, v.type));
      }

      // 4. Build Tree Structure & Sort Replies
      const commentMap = new Map<string, CommentResponseDto>();
      const finalRootCommentsDTO: CommentResponseDto[] = [];

      // Map all comments to DTOs first, including user vote
      allComments.forEach((comment) => {
        const userDto = comment.user
          ? {
              id: comment.user.id,
              username: comment.user.username,
              displayName: comment.user.displayName,
              avatarUrl: comment.user.avatarUrl,
            }
          : null;

        if (!userDto) {
          this.logger.warn(`User data missing for comment ID: ${comment.id}`);
          return;
        }

        const tokenCallDto = comment.tokenCall
          ? {
              id: comment.tokenCall.id,
              targetPrice: comment.tokenCall.targetPrice,
              targetDate: comment.tokenCall.targetDate.toISOString(),
              status: comment.tokenCall.status,
              referencePrice: comment.tokenCall.referencePrice,
              referenceSupply: comment.tokenCall.referenceSupply,
            }
          : null;

        commentMap.set(comment.id, {
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          voteCount: comment.upvotes - comment.downvotes,
          parentId: comment.parentId,
          user: userDto,
          userVoteType: userVotesMap.get(comment.id) || null,
          isRemoved: !!comment.removedById,
          isEdited: comment.isEdited,
          type: comment.type,
          tokenCallId: comment.tokenCallId,
          tokenCall: tokenCallDto,
          removedBy:
            comment.removedById && comment.removedBy
              ? {
                  id: comment.removedBy.id,
                  isSelf: comment.removedBy.id === comment.userId,
                }
              : null,
          replies: [],
        });
      });

      // Build the tree structure
      commentMap.forEach((commentDto, commentId) => {
        if (commentDto.parentId && commentMap.has(commentDto.parentId)) {
          // Ensure parent's replies array exists
          const parentDto = commentMap.get(commentDto.parentId)!;
          if (!parentDto.replies) {
            parentDto.replies = [];
          }
          parentDto.replies.push(commentDto);
        } else if (!commentDto.parentId && rootCommentIds.includes(commentId)) {
          // Add root comments that are on the current page
          finalRootCommentsDTO.push(commentDto);
        }
      });

      // Function to sort replies recursively based on sortBy
      const sortReplies = (
        commentsToSort: CommentResponseDto[],
        currentSortBy: string,
      ) => {
        let sortFn: (a: CommentResponseDto, b: CommentResponseDto) => number;
        switch (currentSortBy) {
          case 'new':
            sortFn = (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            break;
          case 'old':
            sortFn = (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case 'controversial':
            sortFn = (a, b) => {
              // Sort comments with negative scores higher (more controversial)
              const aScore = a.voteCount;
              const bScore = b.voteCount;
              if (aScore < 0 && bScore >= 0) return -1;
              if (aScore >= 0 && bScore < 0) return 1;
              // If both have same sign, fall back to sorting by 'best' (highest absolute score first)
              return b.voteCount - a.voteCount;
            };
            break;
          case 'best':
          default:
            sortFn = (a, b) => b.voteCount - a.voteCount;
            break;
        }

        try {
          commentsToSort.sort(sortFn);
        } catch (e) {
          this.logger.error(`Error sorting replies: ${e}`);
          // Default sort
          commentsToSort.sort((a, b) => b.voteCount - a.voteCount);
        }

        commentsToSort.forEach((c) => {
          if (c.replies && c.replies.length > 0) {
            sortReplies(c.replies, currentSortBy);
          }
        });
      };

      // Sort the replies within each root comment DTO
      finalRootCommentsDTO.forEach((root) => {
        if (root.replies && root.replies.length > 0) {
          sortReplies(root.replies, sortBy);
        }
      });

      // 5. Sort Root Comments
      if (sortInMemory) {
        if (sortBy === 'best') {
          finalRootCommentsDTO.sort((a, b) => b.voteCount - a.voteCount);
        } else if (sortBy === 'controversial') {
          sortReplies(finalRootCommentsDTO, sortBy);
        }
      }

      // Final mapping for removed content, etc.
      const finalData = finalRootCommentsDTO.map((comment) => ({
        ...comment,
        content: comment.isRemoved
          ? `Comment removed by ${comment.removedBy?.isSelf ? 'user' : 'moderator'}`
          : comment.content,
      }));

      return {
        data: finalData,
        meta: {
          total: totalRootComments,
          page,
          limit,
          totalPages: Math.ceil(totalRootComments / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to find comments for ${tokenMintAddress}:`,
        error,
      );
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }
  }

  async findById(
    id: string,
    currentUserId?: string,
  ): Promise<CommentResponseDto | null> {
    try {
      const comment = await this.commentRepository.findOne({
        where: { id },
        relations: ['user', 'removedBy', 'tokenCall'],
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          upvotes: true,
          downvotes: true,
          parentId: true,
          userId: true,
          tokenMintAddress: true,
          removedById: true,
          isEdited: true,
          type: true,
          tokenCallId: true,
          user: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
          removedBy: {
            id: true,
          },
          tokenCall: {
            id: true,
            targetPrice: true,
            targetDate: true,
            status: true,
            referencePrice: true,
            referenceSupply: true,
          },
        },
      });

      if (!comment) {
        return null;
      }

      let userVote = null;
      if (currentUserId) {
        userVote = await this.voteRepository.findOne({
          where: {
            userId: currentUserId,
            commentId: id,
          },
        });
      }

      const tokenCallDto = comment.tokenCall
        ? {
            id: comment.tokenCall.id,
            targetPrice: comment.tokenCall.targetPrice,
            targetDate: comment.tokenCall.targetDate.toISOString(),
            status: comment.tokenCall.status,
            referencePrice: comment.tokenCall.referencePrice,
            referenceSupply: comment.tokenCall.referenceSupply,
          }
        : null;

      return {
        id: comment.id,
        content: comment.removedById
          ? `Comment removed by ${comment.removedBy?.id === comment.userId ? 'user' : 'moderator'}`
          : comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        voteCount: comment.upvotes - comment.downvotes,
        parentId: comment.parentId,
        user: {
          id: comment.user.id,
          username: comment.user.username,
          displayName: comment.user.displayName,
          avatarUrl: comment.user.avatarUrl,
        },
        userVoteType: userVote?.type || null,
        isRemoved: !!comment.removedById,
        isEdited: comment.isEdited,
        type: comment.type,
        tokenCallId: comment.tokenCallId,
        tokenCall: tokenCallDto,
        removedBy: comment.removedById
          ? {
              id: comment.removedBy.id,
              isSelf: comment.removedBy.id === comment.userId,
            }
          : null,
      };
    } catch (error) {
      return null;
    }
  }

  async create(
    createCommentDto: CreateCommentDto,
    userId: string,
  ): Promise<CommentEntity> {
    try {
      let targetTokenMintAddress = createCommentDto.tokenMintAddress;
      let parentComment: CommentEntity | null = null;

      // If this is a reply, find the parent comment
      if (createCommentDto.parentId) {
        parentComment = await this.commentRepository.findOne({
          where: { id: createCommentDto.parentId },
          relations: ['user'],
        });

        if (!parentComment) {
          throw new BadRequestException(
            `Parent comment with ID ${createCommentDto.parentId} not found`,
          );
        }

        // Use the parent's token address for consistency
        targetTokenMintAddress = parentComment.tokenMintAddress;
      }

      // Find token by the determined mint address
      const token = await this.tokenRepository.findOne({
        where: { mintAddress: targetTokenMintAddress }, // Use targetTokenMintAddress
      });

      if (!token) {
        throw new BadRequestException(
          `Token with mint address ${targetTokenMintAddress} not found`,
        );
      }

      // Find user
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Process content for images *before* toxicity check and saving
      const processedContent = await this.processCommentContentForImages(
        createCommentDto.content,
      );

      // Toxicity check on processed content?
      try {
        const analysis = await this.perspectiveService.analyzeText(
          createCommentDto.content,
        );

        // Log whether we're checking or skipping in local environment
        if (process.env.NODE_ENV !== 'production') {
          this.logger.debug(
            'In local environment - Perspective API check was skipped',
          );
        }

        if (analysis.isToxic) {
          throw new BadRequestException(
            'Comment contains toxic content and cannot be posted',
          );
        }
      } catch (error) {
        this.logger.warn(`Perspective API error: ${error.message}`);
      }

      const comment = new CommentEntity();
      // Use the *processed* content with confirmed image URLs
      comment.content = processedContent;
      comment.user = user;
      comment.userId = userId;
      comment.tokenMintAddress = targetTokenMintAddress; // Use the determined address
      comment.token = token;
      comment.parentId = createCommentDto.parentId || null;

      const savedComment = await this.commentRepository.save(comment);

      // Mention Notification
      try {
        const plainTextContent = this.extractPlainText(savedComment.content);
        const mentionedUsernames = this.extractMentions(plainTextContent);
        const uniqueMentions = new Set(mentionedUsernames);

        if (uniqueMentions.size > 0) {
          const potentialRecipients = await this.userRepository.find({
            where: { username: In([...uniqueMentions]) },
            select: ['id', 'username'],
          });

          // Filter out the author and ensure recipient exists
          const recipientsToNotify = potentialRecipients.filter(
            (recipient) => recipient.id !== savedComment.userId,
          );

          if (recipientsToNotify.length > 0) {
            const notificationMessage = `@${user.username} mentioned you in a comment on $${token.symbol}.`;
            const commentExcerpt = plainTextContent.substring(0, 150); // Use plain text excerpt

            recipientsToNotify.forEach((recipientUser) => {
              const metadata: CommentMentionData = {
                commentId: savedComment.id,
                tokenMintAddress: savedComment.tokenMintAddress,
                senderId: savedComment.userId,
                senderUsername: user.username,
                commentExcerpt: commentExcerpt,
              };

              this.notificationsService
                .createNotification(
                  recipientUser.id,
                  NotificationType.COMMENT_MENTION,
                  notificationMessage,
                  savedComment.id,
                  'comment',
                  metadata,
                )
                .catch((error) => {
                  this.logger.error(
                    `Failed to create mention notification for user ${recipientUser.id} from comment ${savedComment.id}: ${error.message}`,
                  );
                });
            });
          }
        }
      } catch (mentionError) {
        this.logger.error(
          `Error processing mentions for comment ${savedComment.id}: ${mentionError.message}`,
          mentionError.stack,
        );
      }

      // Send notification to telegram channel
      try {
        await this.telegramAdminService.notifyNewComment(savedComment);
      } catch (error) {
        this.logger.error(
          `Failed to send telegram notification: ${error.message}`,
          error.stack,
        );
      }

      // Emit gamification event
      this.eventEmitter.emit(GamificationEvent.COMMENT_CREATED, {
        userId,
        commentId: savedComment.id,
        parentId: createCommentDto.parentId || null,
      });

      // If this is a reply, emit the notification event
      if (createCommentDto.parentId && parentComment) {
        if (parentComment.user.id !== userId) {
          // Don't notify for self-replies
          this.eventEmitter.emit(NotificationEventType.COMMENT_REPLY, {
            userId: parentComment.user.id, // Parent comment owner gets notified
            commentId: savedComment.id,
            replyAuthor: user.displayName,
            commentText: savedComment.content.substring(0, 100),
          });
        }
      }

      // Follower Notification Logic
      try {
        const followers = await this.userFollowsRepository.find({
          where: { followedId: savedComment.userId, notify_on_comment: true },
          select: ['followerId'],
        });

        followers.forEach((follow) => {
          this.eventEmitter.emit(NotificationEventType.FOLLOWED_USER_COMMENT, {
            followerId: follow.followerId,
            authorId: savedComment.userId,
            authorUsername: user?.displayName ?? 'User',
            commentId: savedComment.id,
            commentPreview: savedComment.content.substring(0, 100),
            tokenMintAddress: savedComment.tokenMintAddress,
          });
        });
      } catch (notifyError) {
        this.logger.error(
          `Failed to trigger follow notifications for comment ${savedComment.id}: ${notifyError.message}`,
          notifyError.stack,
        );
      }

      return savedComment;
    } catch (error) {
      // Log specific errors if needed
      this.logger.error(
        `Failed to create comment: ${error.message}`,
        error.stack,
      );
      // Re-throw or handle as appropriate
      throw error;
    }
  }

  async update(id: string, dto: UpdateCommentDto, userId: string) {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: {
        user: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.user.id !== userId) {
      throw new UnauthorizedException('Not authorized to update this comment');
    }

    const currentTime = new Date();
    const commentAge =
      currentTime.getTime() - new Date(comment.createdAt).getTime();

    if (commentAge > this.EDIT_WINDOW_MS) {
      throw new ForbiddenException(
        'Comments can only be edited within 15 minutes of posting',
      );
    }

    // Process content for images *before* saving
    const processedContent = await this.processCommentContentForImages(
      dto.content,
    );

    comment.content = processedContent;
    comment.updatedAt = currentTime;
    comment.isEdited = true;
    return this.commentRepository.save(comment);
  }

  async delete(id: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: {
        user: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.user.id !== userId) {
      throw new UnauthorizedException('Not authorized to delete this comment');
    }

    await this.commentRepository.remove(comment);
  }

  async vote(
    commentId: string,
    userId: string,
    type: VoteType,
  ): Promise<VoteResponseDto> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Check if user has already voted this way
    const existingVote = await this.voteRepository.findOne({
      where: { commentId, userId },
    });

    // If same vote type exists, remove it (toggle off)
    if (existingVote?.type === type) {
      await this.voteRepository.remove(existingVote);

      // Get updated vote counts
      const votes = await this.voteRepository.find({ where: { commentId } });
      const upvotes = votes.filter((v) => v.type === 'upvote').length;
      const downvotes = votes.filter((v) => v.type === 'downvote').length;

      // Update comment with new vote counts
      await this.commentRepository.update(commentId, { upvotes, downvotes });

      return {
        upvotes,
        downvotes,
        userVoteType: null, // No active vote after toggle
      };
    }

    // Remove any existing vote (if different type)
    if (existingVote) {
      await this.voteRepository.remove(existingVote);
    }

    // Create new vote
    const vote = new CommentVoteEntity();
    vote.type = type;
    vote.userId = userId;
    vote.commentId = commentId;
    await this.voteRepository.save(vote);

    // Get updated vote counts
    const votes = await this.voteRepository.find({ where: { commentId } });
    const upvotes = votes.filter((v) => v.type === 'upvote').length;
    const downvotes = votes.filter((v) => v.type === 'downvote').length;

    // Update comment with new vote counts
    await this.commentRepository.update(commentId, { upvotes, downvotes });

    // Emit gamification event
    this.eventEmitter.emit(GamificationEvent.COMMENT_VOTED, {
      voterUserId: userId,
      commentOwnerUserId: comment.user.id,
      commentId,
      voteType: type,
    });

    // If this is an upvote, emit notification event for the comment owner
    if (type === 'upvote' && comment.user.id !== userId) {
      // Find voter's name - we only need this for the notification message
      const voterInfo = await this.userRepository.findOne({
        select: ['displayName', 'username'],
        where: { id: userId },
      });

      if (voterInfo) {
        // Use displayName directly, assuming it always exists
        const voterName = voterInfo.displayName;

        // Emit notification specific event
        this.eventEmitter.emit(NotificationEventType.COMMENT_UPVOTED, {
          userId: comment.user.id,
          commentId: comment.id,
          voterName: voterName,
        });
      }
    }

    // Follower Notification Logic
    if (type === 'upvote' && comment.user.id !== userId) {
      try {
        const voterInfo = await this.userRepository.findOne({
          select: ['displayName', 'username'],
          where: { id: userId },
        });

        if (voterInfo) {
          const followers = await this.userFollowsRepository.find({
            where: {
              followedId: userId,
              notify_on_vote: true,
            },
            select: ['followerId'],
          });

          followers.forEach((follow) => {
            this.eventEmitter.emit(NotificationEventType.FOLLOWED_USER_VOTE, {
              followerId: follow.followerId,
              voterId: userId,
              voterUsername: voterInfo.displayName ?? 'User',
              authorId: comment.userId,
              commentId: comment.id,
              tokenMintAddress: comment.tokenMintAddress,
            });
          });
        }
      } catch (notifyError) {
        this.logger.error(
          `Failed to trigger follow notifications for vote on comment ${comment.id}: ${notifyError.message}`,
          notifyError.stack,
        );
      }
    }

    return {
      upvotes,
      downvotes,
      userVoteType: type,
    };
  }

  async getVoteCount(
    commentId: string,
  ): Promise<{ upvotes: number; downvotes: number }> {
    const votes = await this.voteRepository.find({
      where: {
        comment: { id: commentId },
      },
      relations: {
        comment: true,
      },
    });

    return {
      upvotes: votes.filter((v) => v.type === 'upvote').length,
      downvotes: votes.filter((v) => v.type === 'downvote').length,
    };
  }

  async removeComment(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<CommentEntity> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: {
        user: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only allow admins or the comment owner to remove comments
    if (!isAdmin && comment.user.id !== userId) {
      throw new ForbiddenException('Not authorized to remove this comment');
    }

    // Update the comment with removal information
    comment.removedById = userId;
    comment.removalReason = isAdmin
      ? 'Removed by moderator'
      : 'Removed by user';

    return this.commentRepository.save(comment);
  }

  /**
   * Finds all comments globally, sorted by creation date, with pagination.
   */
  async findAllGlobal(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedLatestCommentsResponse> {
    const [comments, total] = await this.commentRepository.findAndCount({
      where: {
        removedById: IsNull(), // Exclude removed comments
      },
      relations: {
        user: true,
        token: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip: (page - 1) * limit,
    });

    const data: LatestComment[] = comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      token: {
        tokenMintAddress: comment.tokenMintAddress,
        symbol: comment.token.symbol,
      },
      user: {
        id: comment.user.id,
        displayName: comment.user.displayName,
        avatarUrl: comment.user.avatarUrl,
      },
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findCommentThread(
    threadCommentId: string,
    currentUserId?: string,
    replySortBy: string = 'new',
  ): Promise<{ rootComment: CommentResponseDto }> {
    try {
      // 1. Find the specific comment requested
      const focusedComment = await this.commentRepository.findOne({
        where: { id: threadCommentId },
        relations: ['user'],
      });

      if (!focusedComment) {
        throw new NotFoundException(
          `Comment with ID ${threadCommentId} not found`,
        );
      }

      // 2. Find the Root Comment ID
      let rootCommentId = focusedComment.id;
      let currentParentId = focusedComment.parentId;
      while (currentParentId) {
        const parent = await this.commentRepository.findOne({
          select: ['id', 'parentId'], // Only select necessary fields for traversal
          where: { id: currentParentId },
        });
        if (!parent) {
          this.logger.error(
            `Comment thread integrity error: parent ${currentParentId} not found for comment ${focusedComment.id}`,
          );
          throw new Error('Comment thread integrity error'); // Internal error
        }
        rootCommentId = parent.id;
        currentParentId = parent.parentId;
      }

      // 3. Fetch All Comment IDs in the Thread
      const recursiveQuery = `
        WITH RECURSIVE comment_tree AS (
          -- Anchor: The root comment of the thread
          SELECT c.id, c."parent_id" FROM comments c WHERE c.id = $1
          UNION ALL
          -- Recursive: Children of comments already in the tree
          SELECT c.id, c."parent_id" FROM comments c JOIN comment_tree ct ON c."parent_id" = ct.id
          -- Optional: Add depth limit \`WHERE ct.depth < N\` if needed
        )
        SELECT id FROM comment_tree;
      `;
      const threadCommentIdsResult = await this.commentRepository.query(
        recursiveQuery,
        [rootCommentId],
      );
      const threadCommentIds = threadCommentIdsResult.map((r) => r.id);

      // 4. Fetch All Comment Entities
      let allThreadComments: CommentEntity[] = [];
      if (threadCommentIds.length > 0) {
        allThreadComments = await this.commentRepository.find({
          where: { id: In(threadCommentIds) },
          relations: ['user', 'removedBy', 'tokenCall'],
          select: {
            id: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            upvotes: true,
            downvotes: true,
            parentId: true,
            userId: true,
            tokenMintAddress: true,
            removedById: true,
            isEdited: true,
            type: true,
            tokenCallId: true,
            user: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
            removedBy: {
              id: true,
            },
            tokenCall: {
              id: true,
              targetPrice: true,
              targetDate: true,
              status: true,
              referencePrice: true,
              referenceSupply: true,
            },
          },
        });
      } else {
        throw new NotFoundException('Could not retrieve thread comments.');
      }

      // 5. Fetch User Votes
      const userVotesMap = new Map<string, VoteType>();
      if (currentUserId && threadCommentIds.length > 0) {
        const votes = await this.voteRepository.find({
          where: { userId: currentUserId, commentId: In(threadCommentIds) },
        });
        votes.forEach((v) => userVotesMap.set(v.commentId, v.type));
      }

      // 6. Build Nested Tree & Map to DTOs
      const commentDtoMap = new Map<string, CommentResponseDto>();

      allThreadComments.forEach((comment) => {
        const userDto = comment.user
          ? {
              id: comment.user.id,
              username: comment.user.username,
              displayName: comment.user.displayName,
              avatarUrl: comment.user.avatarUrl,
            }
          : null;
        if (!userDto) {
          this.logger.warn(
            `User data missing for comment ID during thread fetch: ${comment.id}`,
          );
          return;
        }

        const tokenCallDto = comment.tokenCall
          ? {
              id: comment.tokenCall.id,
              targetPrice: comment.tokenCall.targetPrice,
              targetDate: comment.tokenCall.targetDate.toISOString(),
              status: comment.tokenCall.status,
              referencePrice: comment.tokenCall.referencePrice,
              referenceSupply: comment.tokenCall.referenceSupply,
            }
          : null;

        commentDtoMap.set(comment.id, {
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          voteCount: comment.upvotes - comment.downvotes,
          parentId: comment.parentId,
          user: userDto,
          userVoteType: userVotesMap.get(comment.id) || null,
          isRemoved: !!comment.removedById,
          isEdited: comment.isEdited,
          type: comment.type,
          tokenCallId: comment.tokenCallId,
          tokenCall: tokenCallDto,
          removedBy:
            comment.removedById && comment.removedBy
              ? {
                  id: comment.removedBy.id,
                  isSelf: comment.removedBy.id === comment.userId,
                }
              : null,
          replies: [],
        });
      });

      // Second pass: Build the tree structure
      commentDtoMap.forEach((commentDto) => {
        if (commentDto.parentId && commentDtoMap.has(commentDto.parentId)) {
          commentDtoMap.get(commentDto.parentId)!.replies!.push(commentDto);
        }
      });

      // 7. Sort Replies Recursively
      const sortCommentDtos = (
        commentsToSort: CommentResponseDto[],
        currentSortBy: string,
      ) => {
        let sortFn: (a: CommentResponseDto, b: CommentResponseDto) => number;
        switch (currentSortBy) {
          case 'old':
            sortFn = (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case 'new':
          default:
            sortFn = (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            break;
        }
        try {
          commentsToSort.sort(sortFn);
        } catch (e) {
          this.logger.error(`Error sorting thread replies: ${e}`);
          commentsToSort.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        }
        commentsToSort.forEach((c) => {
          if (c.replies && c.replies.length > 0) {
            sortCommentDtos(c.replies, currentSortBy);
          }
        });
      };

      // Get the root DTO
      const rootCommentDto = commentDtoMap.get(rootCommentId);
      if (!rootCommentDto) {
        this.logger.error(
          `Root comment DTO ${rootCommentId} not found after mapping thread comments.`,
        );
        throw new NotFoundException(
          'Root comment of the thread could not be processed.',
        );
      }

      // Sort the replies starting from the root
      if (rootCommentDto.replies && rootCommentDto.replies.length > 0) {
        sortCommentDtos(rootCommentDto.replies, replySortBy);
      }

      // 8. Final Content Mapping for Removed Comments
      const finalMapContent = (comment: CommentResponseDto) => {
        comment.content =
          comment.isRemoved && comment.removedBy
            ? `Comment removed by ${comment.removedBy.isSelf ? 'user' : 'moderator'}`
            : comment.content;
        if (comment.replies) {
          comment.replies.forEach(finalMapContent);
        }
      };
      finalMapContent(rootCommentDto);

      // 9. Return Result
      return {
        rootComment: rootCommentDto,
      };
    } catch (error) {
      this.logger.error(
        `Failed to find comment thread for ${threadCommentId}:`,
        error,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`An error occurred while fetching the comment thread.`);
    }
  }

  async findOne(id: string): Promise<CommentEntity | null> {
    try {
      return await this.commentRepository.findOne({
        where: { id },
      });
    } catch (error) {
      return null;
    }
  }

  async findVote(id: string): Promise<CommentVoteEntity | null> {
    try {
      return await this.voteRepository.findOne({
        where: { id },
      });
    } catch (error) {
      return null;
    }
  }
}
