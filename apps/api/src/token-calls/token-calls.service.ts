import {
  ActivityType,
  CommentType,
  NotificationEventType,
  PaginatedTokenCallsResult,
  TokenCallStatus,
} from '@dyor-hub/types';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import {
  addDays,
  differenceInDays,
  isFuture,
  isWithinInterval,
  startOfDay,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Between, DataSource, In, Not, Repository } from 'typeorm';
import { CommentResponseDto } from '../comments/dto/comment-response.dto';
import { CommentEntity } from '../entities/comment.entity';
import { TokenCallEntity } from '../entities/token-call.entity';
import { UserActivityEntity } from '../entities/user-activity.entity';
import { UserFollows } from '../entities/user-follows.entity';
import { UserEntity } from '../entities/user.entity';
import { TokensService } from '../tokens/tokens.service';
import { UserTokenCallStatsDto } from '../users/dto/user-token-call-stats.dto';
import { CreateTokenCallDto } from './dto/create-token-call.dto';
import { TokenCallVerificationService } from './token-call-verification.service';

export interface TokenCallFilters {
  username?: string;
  userId?: string;
  tokenId?: string;
  tokenSearch?: string;
  status?: TokenCallStatus[];
  callStartDate?: string;
  callEndDate?: string;
  targetStartDate?: string;
  targetEndDate?: string;
}

@Injectable()
export class TokenCallsService {
  private readonly logger = new Logger(TokenCallsService.name);

  // Define contest period constants (UTC)
  private readonly CONTEST_START_DATE_UTC = new Date(
    Date.UTC(2025, 4, 19, 0, 1, 0),
  );
  private readonly CONTEST_END_DATE_UTC = new Date(
    Date.UTC(2025, 4, 25, 23, 59, 0),
  );

  constructor(
    @InjectRepository(TokenCallEntity)
    private readonly tokenCallRepository: Repository<TokenCallEntity>,
    private readonly tokensService: TokensService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly tokenCallVerificationService: TokenCallVerificationService,
  ) {}

  async create(
    createTokenCallDto: CreateTokenCallDto,
    userId: string,
  ): Promise<{ tokenCall: TokenCallEntity; comment: CommentResponseDto }> {
    const {
      tokenMintAddress,
      targetPrice,
      targetDate: userSuppliedTargetDate,
      explanation,
      isContestEntry,
    } = createTokenCallDto;

    const callTimestamp = new Date();
    const callTimestampUtc = toZonedTime(callTimestamp, 'UTC');

    if (isContestEntry) {
      if (
        !isWithinInterval(callTimestampUtc, {
          start: this.CONTEST_START_DATE_UTC,
          end: this.CONTEST_END_DATE_UTC,
        })
      ) {
        throw new BadRequestException(
          'The token call contest is not currently active or has ended.',
        );
      }
      const userTargetDateUtc = toZonedTime(userSuppliedTargetDate, 'UTC');
      if (
        !isWithinInterval(userTargetDateUtc, {
          start: this.CONTEST_START_DATE_UTC,
          end: this.CONTEST_END_DATE_UTC,
        })
      ) {
        throw new BadRequestException(
          'For contest entries, the predicted target hit date must be within the contest period.',
        );
      }
      const existingContestEntry = await this.tokenCallRepository.findOne({
        where: {
          userId,
          isContestEntry: true,
          createdAt: Between(
            this.CONTEST_START_DATE_UTC,
            this.CONTEST_END_DATE_UTC,
          ),
        },
      });
      if (existingContestEntry) {
        throw new BadRequestException(
          'You have already submitted an entry for this contest period.',
        );
      }
    }

    if (!explanation || explanation.trim().length < 10) {
      throw new BadRequestException(
        'Explanation must be provided and be at least 10 characters long.',
      );
    }

    if (!userSuppliedTargetDate) {
      throw new BadRequestException('Target date must be provided.');
    }

    let finalTargetDate: Date;

    if (
      userSuppliedTargetDate.getHours() === 0 &&
      userSuppliedTargetDate.getMinutes() === 0 &&
      userSuppliedTargetDate.getSeconds() === 0 &&
      userSuppliedTargetDate.getMilliseconds() === 0
    ) {
      finalTargetDate = new Date(userSuppliedTargetDate);
      finalTargetDate.setHours(
        callTimestamp.getHours(),
        callTimestamp.getMinutes(),
        callTimestamp.getSeconds(),
        callTimestamp.getMilliseconds(),
      );
    } else {
      finalTargetDate = userSuppliedTargetDate;
    }

    if (!isFuture(finalTargetDate)) {
      throw new BadRequestException(
        'Target date and time must be in the future.',
      );
    }

    let tokenData: Awaited<ReturnType<TokensService['getTokenData']>>;
    let overviewData: Awaited<ReturnType<TokensService['fetchTokenOverview']>>;

    try {
      tokenData = await this.tokensService.getTokenData(
        tokenMintAddress,
        userId,
      );
      overviewData =
        await this.tokensService.fetchTokenOverview(tokenMintAddress);

      if (isContestEntry) {
        if (!tokenData?.creationTime) {
          throw new BadRequestException(
            'Could not retrieve token creation time for contest validation from token data.',
          );
        }
      }
      if (!overviewData?.price) {
        throw new InternalServerErrorException(
          `Could not establish reference price for ${tokenMintAddress}.`,
        );
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      )
        throw error;
      this.logger.error(
        `Failed token data fetch for ${tokenMintAddress}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        `Could not fetch necessary data for token ${tokenMintAddress}.`,
      );
    }

    const tokenSymbol = tokenData?.symbol ?? 'Token';

    const referencePrice = overviewData.price;
    const referenceSupply =
      overviewData.circulatingSupply ?? overviewData.totalSupply ?? null;
    if (targetPrice <= referencePrice) {
      throw new BadRequestException(
        `Target price ($${targetPrice.toLocaleString()}) must be higher than the reference price ($${referencePrice.toLocaleString()}) at the time of submission.`,
      );
    }

    if (isContestEntry && tokenData?.creationTime) {
      const tokenCreationTimestamp = Math.floor(
        tokenData.creationTime.getTime() / 1000,
      );
      const tokenCreationDateUtc = toZonedTime(
        new Date(tokenCreationTimestamp * 1000),
        'UTC',
      );
      const sevenDaysAgo = startOfDay(addDays(callTimestampUtc, -7));

      if (tokenCreationDateUtc > sevenDaysAgo) {
        const daysOld = differenceInDays(
          startOfDay(callTimestampUtc),
          startOfDay(tokenCreationDateUtc),
        );
        throw new BadRequestException(
          `Token must be at least 7 days old for contest entry. This token is approximately ${daysOld} day(s) old.`,
        );
      }

      const marketCap = overviewData?.marketCap ?? 0;
      if (marketCap < 100000) {
        throw new BadRequestException(
          `Token market cap must be at least $100,000 for contest entry. Current MC: $${marketCap.toLocaleString()}.`,
        );
      }

      const liquidity = overviewData?.liquidity ?? 0;
      if (liquidity < 10000) {
        throw new BadRequestException(
          `Token liquidity must be at least $10,000 for contest entry. Current liquidity: $${liquidity.toLocaleString()}.`,
        );
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedCall: TokenCallEntity | null = null;
    let savedComment: CommentEntity | null = null;
    let user: UserEntity | null = null;

    try {
      const newCall = queryRunner.manager.create(TokenCallEntity, {
        userId,
        tokenId: tokenMintAddress,
        callTimestamp,
        referencePrice: referencePrice,
        referenceSupply: referenceSupply,
        targetPrice,
        targetDate: finalTargetDate,
        status: TokenCallStatus.PENDING,
        isContestEntry: !!isContestEntry,
      });

      savedCall = await queryRunner.manager.save(TokenCallEntity, newCall);

      const explanationComment = queryRunner.manager.create(CommentEntity, {
        userId,
        tokenMintAddress: tokenMintAddress,
        content: explanation,
        type: CommentType.TOKEN_CALL_EXPLANATION,
        tokenCallId: savedCall.id,
        parentId: null,
        upvotes: 0,
        downvotes: 0,
      });

      savedComment = await queryRunner.manager.save(
        CommentEntity,
        explanationComment,
      );

      await queryRunner.manager.update(TokenCallEntity, savedCall.id, {
        explanationCommentId: savedComment.id,
      });

      savedCall.explanationCommentId = savedComment.id;

      const predictionActivity = queryRunner.manager.create(
        UserActivityEntity,
        {
          userId: savedCall.userId,
          activityType: ActivityType.PREDICTION,
          entityId: savedCall.id,
          entityType: 'prediction',
        },
      );
      await queryRunner.manager.save(UserActivityEntity, predictionActivity);

      user = await queryRunner.manager.findOne(UserEntity, {
        where: { id: userId },
      });

      const followers = await queryRunner.manager.find(UserFollows, {
        where: {
          followedId: savedCall.userId,
          notify_on_prediction: true,
        },
        select: ['followerId'],
      });

      const notificationPayloads = followers.map((follow) => ({
        type: NotificationEventType.FOLLOWED_USER_PREDICTION,
        data: {
          followerId: follow.followerId,
          followedUserId: savedCall.userId,
          followedUsername: user?.username ?? 'User',
          predictionId: savedCall.id,
          tokenSymbol: tokenSymbol,
          tokenMintAddress: savedCall.tokenId,
        },
      }));

      await queryRunner.commitTransaction();

      notificationPayloads.forEach((payload) => {
        try {
          this.eventEmitter.emit(payload.type, payload.data);
        } catch (emitError) {
          this.logger.error(
            `Failed to emit ${payload.type} event: ${emitError.message}`,
            emitError.stack,
          );
        }
      });

      const commentDto = {
        id: savedComment.id,
        content: savedComment.content,
        createdAt: savedComment.createdAt,
        updatedAt: savedComment.updatedAt,
        voteCount: 0,
        parentId: null,
        user: user
          ? {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
            }
          : {
              id: userId,
              username: null,
              displayName: null,
              avatarUrl: null,
            },
        userVoteType: null,
        isRemoved: false,
        isEdited: false,
        type: savedComment.type,
        tokenCallId: savedCall.id,
        tokenCall: {
          id: savedCall.id,
          targetPrice: savedCall.targetPrice,
          targetDate: savedCall.targetDate.toISOString(),
          status: savedCall.status,
          referencePrice: savedCall.referencePrice,
          referenceSupply: savedCall.referenceSupply,
        },
        removedBy: null,
        replies: [],
      };

      return { tokenCall: savedCall, comment: commentDto };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed transaction for token call by user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not save token call and its explanation.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async findPendingCallsPastTargetDate(date: Date): Promise<TokenCallEntity[]> {
    return this.tokenCallRepository
      .createQueryBuilder('call')
      .where('call.status = :status', { status: TokenCallStatus.PENDING })
      .andWhere('call.targetDate <= :date', { date })
      .getMany();
  }

  async findAllPublic(
    pagination: { page: number; limit: number },
    filters: TokenCallFilters = {},
    sort: { sortBy?: string; sortOrder?: 'ASC' | 'DESC' } = {},
  ): Promise<PaginatedTokenCallsResult> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const { sortBy = 'createdAt', sortOrder = 'DESC' } = sort;

    const queryBuilder = this.tokenCallRepository
      .createQueryBuilder('call')
      .leftJoin('call.user', 'user')
      .addSelect([
        'user.id',
        'user.username',
        'user.displayName',
        'user.avatarUrl',
      ])
      .leftJoin('call.token', 'token')
      .addSelect([
        'token.mintAddress',
        'token.name',
        'token.symbol',
        'token.imageUrl',
      ])
      .skip(skip)
      .take(limit);

    const parameters: { [key: string]: any } = {};
    const whereConditions: string[] = [];

    if (filters.username) {
      whereConditions.push('user.username ILIKE :username');
      parameters.username = `%${filters.username}%`;
    }
    if (filters.userId) {
      whereConditions.push('call.userId = :userId');
      parameters.userId = filters.userId;
    }
    if (filters.tokenId) {
      whereConditions.push('call.tokenId = :tokenId');
      parameters.tokenId = filters.tokenId;
    }
    if (filters.tokenSearch) {
      whereConditions.push(
        '(token.mintAddress ILIKE :tokenSearch OR token.symbol ILIKE :tokenSearch OR token.name ILIKE :tokenSearch)',
      );
      parameters.tokenSearch = `%${filters.tokenSearch}%`;
    }
    if (filters.status && filters.status.length > 0) {
      const validStatuses = filters.status.filter((s) =>
        Object.values(TokenCallStatus).includes(s),
      );
      if (validStatuses.length > 0) {
        whereConditions.push('call.status IN (:...statuses)');
        parameters.statuses = validStatuses;
      }
    } else {
      whereConditions.push('call.status != :excludedStatus');
      parameters.excludedStatus = TokenCallStatus.ERROR;
    }
    if (filters.callStartDate && filters.callEndDate) {
      try {
        const start = new Date(filters.callStartDate);
        const end = new Date(filters.callEndDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error();
        whereConditions.push(
          'call.callTimestamp BETWEEN :callStart AND :callEnd',
        );
        parameters.callStart = start;
        parameters.callEnd = end;
      } catch (e) {
        throw new BadRequestException('Invalid call start/end date format.');
      }
    }
    if (filters.targetStartDate && filters.targetEndDate) {
      try {
        const start = new Date(filters.targetStartDate);
        const end = new Date(filters.targetEndDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error();
        whereConditions.push(
          'call.targetDate BETWEEN :targetStart AND :targetEnd',
        );
        parameters.targetStart = start;
        parameters.targetEnd = end;
      } catch (e) {
        throw new BadRequestException('Invalid target start/end date format.');
      }
    }

    if (whereConditions.length > 0) {
      queryBuilder.where(whereConditions.join(' AND '), parameters);
    }

    if (sortBy === 'multiplier') {
      queryBuilder.addSelect(
        '(CASE WHEN call.referencePrice <> 0 THEN call.targetPrice / call.referencePrice ELSE NULL END)',
        'call_multiplier',
      );
      queryBuilder.orderBy(
        'call_multiplier',
        sortOrder,
        sortOrder === 'DESC' ? 'NULLS LAST' : 'NULLS FIRST',
      );
    } else {
      const orderField = `call.${sortBy}`;
      const metadata = this.tokenCallRepository.metadata;
      if (metadata.hasColumnWithPropertyPath(sortBy)) {
        queryBuilder.orderBy(orderField, sortOrder);
      } else {
        this.logger.warn(
          `Invalid sort field provided: ${sortBy}. Defaulting to createdAt.`,
        );
        queryBuilder.orderBy('call.createdAt', 'DESC');
      }
    }
    if (sortBy !== 'createdAt') {
      queryBuilder.addOrderBy('call.createdAt', 'DESC');
    }

    try {
      const [calls, total] = await queryBuilder.getManyAndCount();

      const items = calls.map((call) => ({
        id: call.id,
        userId: call.userId,
        tokenId: call.tokenId,
        callTimestamp: call.callTimestamp.toISOString(),
        referencePrice: call.referencePrice,
        referenceSupply: call.referenceSupply,
        targetPrice: call.targetPrice,
        targetDate: call.targetDate.toISOString(),
        status: call.status,
        verificationTimestamp:
          call.verificationTimestamp?.toISOString() || null,
        targetHitTimestamp: call.targetHitTimestamp?.toISOString() || null,
        peakPriceDuringPeriod: call.peakPriceDuringPeriod,
        finalPriceAtTargetDate: call.finalPriceAtTargetDate,
        timeToHitRatio: call.timeToHitRatio,
        priceHistoryUrl: call.priceHistoryUrl,
        createdAt: call.createdAt.toISOString(),
        updatedAt: call.updatedAt.toISOString(),
        isContestEntry: call.isContestEntry,
        user: call.user
          ? {
              id: call.user.id,
              username: call.user.username,
              displayName: call.user.displayName,
              avatarUrl: call.user.avatarUrl,
            }
          : undefined,
        token: call.token
          ? {
              mintAddress: call.token.mintAddress,
              name: call.token.name,
              symbol: call.token.symbol,
              imageUrl: call.token.imageUrl,
            }
          : undefined,
      }));

      return { items, total, page, limit };
    } catch (error) {
      this.logger.error(
        `Failed to fetch public token calls with filters: ${JSON.stringify(filters)}`,
        error.stack,
      );
      if (error.query && error.parameters) {
        throw new BadRequestException(`Query error: ${error.message}`);
      }
      throw new InternalServerErrorException('Could not fetch token calls.');
    }
  }

  async findOneById(callId: string): Promise<TokenCallEntity> {
    try {
      const call = await this.tokenCallRepository.findOne({
        where: { id: callId },
        relations: {
          token: true,
          user: true,
          explanationComment: { user: true },
        },
        select: {
          id: true,
          userId: true,
          tokenId: true,
          callTimestamp: true,
          referencePrice: true,
          referenceSupply: true,
          targetPrice: true,
          targetDate: true,
          status: true,
          verificationTimestamp: true,
          peakPriceDuringPeriod: true,
          finalPriceAtTargetDate: true,
          targetHitTimestamp: true,
          timeToHitRatio: true,
          createdAt: true,
          updatedAt: true,
          priceHistoryUrl: true,
          token: {
            mintAddress: true,
            name: true,
            symbol: true,
            imageUrl: true,
          },
          user: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      });

      if (!call) {
        throw new NotFoundException(`Token call with ID ${callId} not found.`);
      }
      return call;
    } catch (error) {
      this.logger.error(`Failed to fetch token call ${callId}`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Could not fetch token call details.',
      );
    }
  }

  async calculateUserStats(userId: string): Promise<UserTokenCallStatsDto> {
    this.logger.log(`Calculating token call stats for user ${userId}`);

    try {
      const allCalls = await this.tokenCallRepository.count({
        where: {
          userId: userId,
          status: Not(TokenCallStatus.ERROR),
        },
      });

      const verifiedCalls = await this.tokenCallRepository.find({
        where: {
          userId: userId,
          status: In([
            TokenCallStatus.VERIFIED_SUCCESS,
            TokenCallStatus.VERIFIED_FAIL,
          ]),
        },
        select: [
          'status',
          'referencePrice',
          'targetPrice',
          'timeToHitRatio',
          'peakPriceDuringPeriod',
          'id',
          'referenceSupply',
        ],
      });

      const successfulCalls = verifiedCalls.filter(
        (call) => call.status === TokenCallStatus.VERIFIED_SUCCESS,
      );
      const verifiedCallsCount = verifiedCalls.length;
      const failedCalls = verifiedCallsCount - successfulCalls.length;
      const accuracyRate =
        verifiedCallsCount > 0
          ? successfulCalls.length / verifiedCallsCount
          : 0;

      let totalGainPercent = 0;
      let totalTimeToHitRatio = 0;
      let totalMultiplier = 0;
      let successfulCallsWithValidData = 0;
      let totalMarketCapAtCallTime = 0;
      let callsWithMarketCapAtCallTime = 0;

      for (const call of verifiedCalls) {
        if (
          call.referencePrice > 0 &&
          call.referenceSupply &&
          call.referenceSupply > 0
        ) {
          totalMarketCapAtCallTime +=
            call.referencePrice * call.referenceSupply;
          callsWithMarketCapAtCallTime++;
        }
      }

      for (const call of successfulCalls) {
        const refPrice = call.referencePrice;
        const targetPrice = call.targetPrice;
        const peakPrice = call.peakPriceDuringPeriod;
        let gainPercent = 0;
        let multiplier = 0;

        if (refPrice > 0) {
          gainPercent = ((targetPrice - refPrice) / refPrice) * 100;
          multiplier = peakPrice / refPrice;
        }

        if (
          call.timeToHitRatio !== null &&
          isFinite(gainPercent) &&
          isFinite(multiplier)
        ) {
          totalGainPercent += gainPercent;
          totalTimeToHitRatio += call.timeToHitRatio;
          totalMultiplier += multiplier;
          successfulCallsWithValidData++;
        } else {
          this.logger.warn(
            `Call ${call.id} excluded from average calculation due to null/invalid data (ratio: ${call.timeToHitRatio}, gain: ${gainPercent}, multiplier: ${multiplier})`,
          );
        }
      }

      const averageGainPercent =
        successfulCallsWithValidData > 0
          ? totalGainPercent / successfulCallsWithValidData
          : null;
      const averageTimeToHitRatio =
        successfulCallsWithValidData > 0
          ? totalTimeToHitRatio / successfulCallsWithValidData
          : null;
      const averageMultiplier =
        successfulCallsWithValidData > 0
          ? totalMultiplier / successfulCallsWithValidData
          : null;

      const averageMarketCapAtCallTime =
        callsWithMarketCapAtCallTime > 0
          ? totalMarketCapAtCallTime / callsWithMarketCapAtCallTime
          : null;

      return {
        totalCalls: allCalls,
        successfulCalls: successfulCalls.length,
        failedCalls,
        accuracyRate,
        averageGainPercent,
        averageTimeToHitRatio,
        averageMultiplier,
        averageMarketCapAtCallTime,
      };
    } catch (error) {
      this.logger.error(
        `Failed to calculate token call stats for user ${userId}`,
        error,
      );
      throw new InternalServerErrorException(
        'Could not calculate user statistics.',
      );
    }
  }

  async manuallyVerifyTokenCall(
    tokenCallId: string,
    requestingUserId: string,
  ): Promise<TokenCallEntity> {
    const tokenCall = await this.tokenCallRepository.findOne({
      where: { id: tokenCallId },
      relations: ['user'],
    });

    if (!tokenCall) {
      throw new NotFoundException(
        `Token call with ID ${tokenCallId} not found.`,
      );
    }

    if (tokenCall.userId !== requestingUserId) {
      throw new ForbiddenException(
        'You are not authorized to verify this token call.',
      );
    }

    if (tokenCall.status !== TokenCallStatus.PENDING) {
      throw new BadRequestException(
        'This token call is not pending and cannot be manually verified.',
      );
    }

    try {
      const callToVerify = await this.tokenCallRepository.findOneByOrFail({
        id: tokenCallId,
      });
      await this.tokenCallVerificationService.verifySingleCall(callToVerify);

      const updatedTokenCall = await this.tokenCallRepository.findOne({
        where: { id: tokenCallId },
        relations: [
          'user',
          'token',
          'explanationComment',
          'explanationComment.user',
        ],
      });

      if (!updatedTokenCall) {
        throw new InternalServerErrorException(
          'Failed to refetch token call after manual verification.',
        );
      }

      return updatedTokenCall;
    } catch (error) {
      this.logger.error(
        `Error during manual verification of token call ${tokenCallId} by user ${requestingUserId}: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `An error occurred while manually verifying the token call: ${error.message}`,
      );
    }
  }
}
