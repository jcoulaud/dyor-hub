import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserFollows } from '../entities';
import { PaginatedResult, UsersService } from '../users/users.service';
import { UpdateFollowPreferencesDto } from './dto/update-follow-preferences.dto';

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(UserFollows)
    private readonly userFollowsRepository: Repository<UserFollows>,
    private readonly usersService: UsersService,
  ) {}

  async followUser(
    followerId: string,
    followedId: string,
  ): Promise<UserFollows> {
    if (followerId === followedId) {
      throw new ConflictException('Users cannot follow themselves.');
    }

    // Check if both users exist
    const follower = await this.usersService.findById(followerId);
    if (!follower) {
      throw new NotFoundException(
        `Follower user with ID ${followerId} not found.`,
      );
    }
    const followed = await this.usersService.findById(followedId);
    if (!followed) {
      throw new NotFoundException(
        `Followed user with ID ${followedId} not found.`,
      );
    }

    const existingFollow = await this.userFollowsRepository.findOneBy({
      followerId,
      followedId,
    });

    if (existingFollow) {
      return existingFollow;
    }

    const newFollow = this.userFollowsRepository.create({
      followerId,
      followedId,
    });

    return this.userFollowsRepository.save(newFollow);
  }

  async unfollowUser(followerId: string, followedId: string): Promise<void> {
    // Add checks for user existence
    const follower = await this.usersService.findById(followerId);
    if (!follower) {
      throw new NotFoundException(
        `Follower user with ID ${followerId} not found.`,
      );
    }
    const followed = await this.usersService.findById(followedId);
    if (!followed) {
      throw new NotFoundException(
        `Followed user with ID ${followedId} not found.`,
      );
    }

    // Proceed with delete
    await this.userFollowsRepository.delete({
      followerId,
      followedId,
    });
    // No need to check result.affected, operation is idempotent.
  }

  // Method to get follow record
  async getFollowRelationship(
    followerId: string,
    followedId: string,
  ): Promise<UserFollows | null> {
    return this.userFollowsRepository.findOneBy({ followerId, followedId });
  }

  async getFollowing(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<UserEntity>> {
    const offset = (page - 1) * limit;

    const [follows, total] = await this.userFollowsRepository.findAndCount({
      where: { followerId: userId },
      relations: ['followed'],
      take: limit,
      skip: offset,
      order: { created_at: 'DESC' },
    });

    const data: UserEntity[] = follows.map((follow) => follow.followed);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getFollowers(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<UserEntity>> {
    const offset = (page - 1) * limit;

    const [follows, total] = await this.userFollowsRepository.findAndCount({
      where: { followedId: userId },
      relations: ['follower'],
      take: limit,
      skip: offset,
      order: { created_at: 'DESC' },
    });

    const data: UserEntity[] = follows.map((follow) => follow.follower);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateFollowPreferences(
    followerId: string,
    followedId: string,
    preferences: UpdateFollowPreferencesDto,
  ): Promise<UserFollows> {
    const followRelationship = await this.userFollowsRepository.findOneBy({
      followerId,
      followedId,
    });

    if (!followRelationship) {
      throw new NotFoundException('Follow relationship not found.');
    }

    // Merge existing preferences with new ones
    const updatePayload: Partial<UserFollows> = {};
    if (preferences.prediction !== undefined) {
      updatePayload.notify_on_prediction = preferences.prediction;
    }
    if (preferences.comment !== undefined) {
      updatePayload.notify_on_comment = preferences.comment;
    }
    if (preferences.vote !== undefined) {
      updatePayload.notify_on_vote = preferences.vote;
    }

    // Avoid update if no preferences were actually changed
    if (Object.keys(updatePayload).length === 0) {
      return followRelationship;
    }

    await this.userFollowsRepository.update(
      { followerId, followedId },
      updatePayload,
    );

    return this.userFollowsRepository.findOneByOrFail({
      followerId,
      followedId,
    });
  }

  async getFollowersCount(userId: string): Promise<number> {
    return this.userFollowsRepository.count({ where: { followedId: userId } });
  }

  async getFollowingCount(userId: string): Promise<number> {
    return this.userFollowsRepository.count({ where: { followerId: userId } });
  }
}
