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
import { LeaderboardQueryDto } from './dto/tokenCallsLeaderboard-query.dto'; // Removed unused LeaderboardSortField

interface RawLeaderboardResult {
  userId: string;
  totalCalls: string;
  successfulCalls: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  sumTimeToHitRatio: string | null;
  countSuccessfulCallsWithRatio: string;
  sumMultiplier: string | null;
  countSuccessfulCallsWithPrice: string;
  sumMarketCapAtCallTime: string | null;
  countCallsWithMarketCapAtCallTime: string;
}

interface ProcessedLeaderboardUser {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  totalCalls: number;
  successfulCalls: number;
  accuracyRate: number;
  averageTimeToHitRatio: number | null;
  averageMultiplier: number | null;
  averageMarketCapAtCallTime: number | null;
  adjustedScore: number; // Added adjusted score
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
    const { page = 1, limit = 25 } = queryDto;
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(5, limit));
    const skip = (validPage - 1) * validLimit;

    try {
      // 1. Build Query to Fetch Raw Aggregated Data
      const queryBuilder = this.tokenCallRepository
        .createQueryBuilder('call')
        .select('call.userId', 'userId')
        .addSelect('COUNT(call.id)', 'totalCalls')
        .addSelect(
          `SUM(CASE WHEN call.status = '${TokenCallStatus.VERIFIED_SUCCESS}' THEN 1 ELSE 0 END)`,
          'successfulCalls',
        )
        .addSelect(
          `SUM(CASE WHEN call.status = '${TokenCallStatus.VERIFIED_SUCCESS}' THEN call.timeToHitRatio ELSE NULL END)`,
          'sumTimeToHitRatio',
        )
        .addSelect(
          `COUNT(CASE WHEN call.status = '${TokenCallStatus.VERIFIED_SUCCESS}' AND call.timeToHitRatio IS NOT NULL THEN 1 ELSE NULL END)`,
          'countSuccessfulCallsWithRatio',
        )
        .addSelect(
          // Calculate sum of multipliers (target/reference) for successful calls where reference price is not zero
          `SUM(CASE WHEN call.status = '${TokenCallStatus.VERIFIED_SUCCESS}' AND call.referencePrice <> 0 THEN call.targetPrice / call.referencePrice ELSE NULL END)`,
          'sumMultiplier',
        )
        .addSelect(
          // Count successful calls where multiplier can be calculated
          `COUNT(CASE WHEN call.status = '${TokenCallStatus.VERIFIED_SUCCESS}' AND call.referencePrice <> 0 THEN 1 ELSE NULL END)`,
          'countSuccessfulCallsWithPrice',
        )
        .addSelect(
          `SUM(CASE WHEN call.referencePrice > 0 AND call.referenceSupply > 0 THEN call.referencePrice * call.referenceSupply ELSE NULL END)`,
          'sumMarketCapAtCallTime',
        )
        .addSelect(
          `COUNT(CASE WHEN call.referencePrice > 0 AND call.referenceSupply > 0 THEN 1 ELSE NULL END)`,
          'countCallsWithMarketCapAtCallTime',
        )
        .innerJoin('call.user', 'user')
        .addSelect('user.username', 'username')
        .addSelect('user.displayName', 'displayName')
        .addSelect('user.avatarUrl', 'avatarUrl')
        .where('call.status IN (:...statuses)', {
          // Only consider verified calls for leaderboard stats
          statuses: [
            TokenCallStatus.VERIFIED_SUCCESS,
            TokenCallStatus.VERIFIED_FAIL,
          ],
        })
        .groupBy('call.userId')
        .addGroupBy('user.id');

      // Fetch ALL raw results
      const rawResults: RawLeaderboardResult[] =
        await queryBuilder.getRawMany();

      if (!rawResults || rawResults.length === 0) {
        return { items: [], total: 0, page: validPage, limit: validLimit };
      }

      // 2. Process Raw Results: Calculate Derived Stats and Adjusted Score
      const processedUsers: ProcessedLeaderboardUser[] = rawResults.map(
        (result) => {
          const totalCallsNum = parseInt(result.totalCalls, 10);
          const successfulCallsNum = parseInt(result.successfulCalls, 10);
          const accuracyRate =
            totalCallsNum > 0 ? successfulCallsNum / totalCallsNum : 0;

          // Calculate Average Time To Hit Ratio
          const sumRatio = result.sumTimeToHitRatio
            ? parseFloat(result.sumTimeToHitRatio)
            : null;
          const countRatio = parseInt(result.countSuccessfulCallsWithRatio, 10);
          const averageTimeToHitRatio =
            sumRatio !== null && countRatio > 0 ? sumRatio / countRatio : null;

          // Calculate Average Multiplier
          const sumMultiplier = result.sumMultiplier
            ? parseFloat(result.sumMultiplier)
            : null;
          const countMultiplier = parseInt(
            result.countSuccessfulCallsWithPrice,
            10,
          );
          const averageMultiplier =
            sumMultiplier !== null && countMultiplier > 0
              ? sumMultiplier / countMultiplier
              : null;

          // Calculate Average Market Cap At Call Time
          const sumMarketCapAtCall = result.sumMarketCapAtCallTime
            ? parseFloat(result.sumMarketCapAtCallTime)
            : null;
          const countMarketCapAtCall = parseInt(
            result.countCallsWithMarketCapAtCallTime,
            10,
          );
          const averageMarketCapAtCallTime =
            sumMarketCapAtCall !== null && countMarketCapAtCall > 0
              ? sumMarketCapAtCall / countMarketCapAtCall
              : null;

          // Calculate Adjusted Score
          let adjustedScore = 0;
          if (totalCallsNum > 0) {
            const accuracy = successfulCallsNum / totalCallsNum;
            const volumeFactor = Math.log(totalCallsNum + 1);
            adjustedScore = accuracy * volumeFactor;
          }

          return {
            userId: result.userId,
            username: result.username,
            displayName: result.displayName,
            avatarUrl: result.avatarUrl,
            totalCalls: totalCallsNum,
            successfulCalls: successfulCallsNum,
            accuracyRate: accuracyRate,
            averageTimeToHitRatio: averageTimeToHitRatio,
            averageMultiplier: averageMultiplier,
            averageMarketCapAtCallTime: averageMarketCapAtCallTime,
            adjustedScore: adjustedScore,
          };
        },
      );

      // 3. Sort Processed Results In-Memory
      processedUsers.sort((a, b) => {
        // Primary sort: Adjusted Score (Descending)
        if (b.adjustedScore !== a.adjustedScore) {
          return b.adjustedScore - a.adjustedScore;
        }
        // Secondary sort: Average Multiplier (Descending, handle nulls)
        const multiplierA = a.averageMultiplier ?? 0;
        const multiplierB = b.averageMultiplier ?? 0;
        if (multiplierB !== multiplierA) {
          return multiplierB - multiplierA;
        }
        // Tertiary sort: Total Calls (Descending, optional tie-breaker)
        return b.totalCalls - a.totalCalls;
      });

      // 4. Apply Pagination to Sorted Array
      const totalCount = processedUsers.length;
      const paginatedUsers = processedUsers.slice(skip, skip + validLimit);

      // 5. Map to DTO and Assign Rank
      const items = paginatedUsers.map((userStats, index) => {
        const userDto = plainToInstance(
          UserMinimumResponseDto,
          {
            id: userStats.userId,
            username: userStats.username,
            displayName: userStats.displayName,
            avatarUrl: userStats.avatarUrl,
          },
          { excludeExtraneousValues: true },
        );

        return plainToInstance(
          LeaderboardEntryDto,
          {
            rank: skip + index + 1, // Calculate rank based on position in sorted, paginated list
            user: userDto,
            totalCalls: userStats.totalCalls,
            successfulCalls: userStats.successfulCalls,
            accuracyRate: userStats.accuracyRate,
            averageTimeToHitRatio: userStats.averageTimeToHitRatio,
            averageMultiplier: userStats.averageMultiplier,
            averageMarketCapAtCallTime: userStats.averageMarketCapAtCallTime,
            adjustedScore: userStats.adjustedScore, // Include adjusted score in response
          },
          { excludeExtraneousValues: true },
        );
      });

      return { items, total: totalCount, page: validPage, limit: validLimit };
    } catch (error) {
      this.logger.error('Failed to fetch token call leaderboard:', error);
      throw new InternalServerErrorException(
        'Could not fetch leaderboard data.',
      );
    }
  }
}
