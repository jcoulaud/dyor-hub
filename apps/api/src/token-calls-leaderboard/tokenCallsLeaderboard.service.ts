import { TokenCallStatus } from '@dyor-hub/types';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';
import { TokenCallEntity } from '../entities/token-call.entity';
import { UserMinimumResponseDto } from '../users/dto/user-minimum-response.dto';
import { LeaderboardEntryDto } from './dto/tokenCallsLeaderboard-entry.dto';
import {
  LeaderboardQueryDto,
  LeaderboardSortField,
} from './dto/tokenCallsLeaderboard-query.dto';

interface RawLeaderboardResult {
  userId: string;
  totalCalls: string;
  successfulCalls: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export interface PaginatedLeaderboardResult {
  items: LeaderboardEntryDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class TokenCallsLeaderboardService {
  private readonly logger = new Logger(TokenCallsLeaderboardService.name);

  constructor(
    @InjectRepository(TokenCallEntity)
    private readonly tokenCallRepository: Repository<TokenCallEntity>,
  ) {}

  async getTokenCallLeaderboard(
    queryDto: LeaderboardQueryDto,
  ): Promise<PaginatedLeaderboardResult> {
    const {
      page = 1,
      limit = 25,
      sortBy = LeaderboardSortField.ACCURACY_RATE,
    } = queryDto;
    const skip = (page - 1) * limit;

    try {
      const queryBuilder = this.tokenCallRepository
        .createQueryBuilder('call')
        .select('call.userId', 'userId')
        .addSelect('COUNT(call.id)', 'totalCalls')
        .addSelect(
          `SUM(CASE WHEN call.status = '${TokenCallStatus.VERIFIED_SUCCESS}' THEN 1 ELSE 0 END)`,
          'successfulCalls',
        )
        .innerJoin('call.user', 'user')
        .addSelect('user.username', 'username')
        .addSelect('user.displayName', 'displayName')
        .addSelect('user.avatarUrl', 'avatarUrl')
        .where('call.status IN (:...statuses)', {
          statuses: [
            TokenCallStatus.VERIFIED_SUCCESS,
            TokenCallStatus.VERIFIED_FAIL,
          ],
        })
        .groupBy('call.userId')
        .addGroupBy('user.id');

      queryBuilder.addSelect(
        `(SUM(CASE WHEN call.status = '${TokenCallStatus.VERIFIED_SUCCESS}' THEN 1.0 ELSE 0.0 END) / COALESCE(NULLIF(COUNT(call.id), 0), 1.0))`,
        'accuracyRate',
      );

      switch (sortBy) {
        case LeaderboardSortField.SUCCESSFUL_CALLS:
          queryBuilder.orderBy(`"successfulCalls"`, 'DESC');
          break;
        case LeaderboardSortField.TOTAL_CALLS:
          queryBuilder.orderBy(`"totalCalls"`, 'DESC');
          break;
        case LeaderboardSortField.ACCURACY_RATE:
        default:
          queryBuilder.orderBy(`"accuracyRate"`, 'DESC');
          queryBuilder.addOrderBy(`"totalCalls"`, 'DESC');
          break;
      }

      const total = await queryBuilder.getCount();

      queryBuilder.offset(skip).limit(limit);

      const rawResults: RawLeaderboardResult[] =
        await queryBuilder.getRawMany();

      const items = rawResults.map((result, index) => {
        const totalCallsNum = parseInt(result.totalCalls, 10);
        const successfulCallsNum = parseInt(result.successfulCalls, 10);
        const accuracyRate =
          totalCallsNum > 0 ? successfulCallsNum / totalCallsNum : 0;

        const user = plainToInstance(
          UserMinimumResponseDto,
          {
            id: result.userId,
            username: result.username,
            displayName: result.displayName,
            avatarUrl: result.avatarUrl,
          },
          { excludeExtraneousValues: true },
        );

        return plainToInstance(
          LeaderboardEntryDto,
          {
            rank: skip + index + 1,
            user: user,
            totalCalls: totalCallsNum,
            successfulCalls: successfulCallsNum,
            accuracyRate: accuracyRate,
          },
          { excludeExtraneousValues: true },
        );
      });

      return { items, total, page, limit };
    } catch (error) {
      this.logger.error('Failed to fetch token call leaderboard:', error);
      throw new InternalServerErrorException(
        'Could not fetch leaderboard data.',
      );
    }
  }
}
