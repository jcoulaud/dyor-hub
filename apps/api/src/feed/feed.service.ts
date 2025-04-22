import { PaginatedResult } from '@dyor-hub/types';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserActivityEntity } from '../entities';
import { FollowsService } from '../follows/follows.service';

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(UserActivityEntity)
    private readonly userActivityRepository: Repository<UserActivityEntity>,
    private readonly followsService: FollowsService,
  ) {}

  async getFollowingFeed(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<UserActivityEntity>> {
    const offset = (page - 1) * limit;

    // 1. Get the list of users the current user follows
    // TODO: Handle pagination if the followed list is huge?
    const followingResult = await this.followsService.getFollowing(
      userId,
      1,
      1000,
    );
    const followedUserIds = followingResult.data.map((user) => user.id);

    if (followedUserIds.length === 0) {
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    // 2. Get activities for those followed users
    const [activities, total] = await this.userActivityRepository.findAndCount({
      where: {
        userId: In(followedUserIds),
      },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      data: activities,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
