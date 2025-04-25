import { PaginatedResult, ReferralLeaderboardEntry } from '@dyor-hub/types';
import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Referral } from '../entities/referral.entity';
import { UserEntity } from '../entities/user.entity';
import { ApplyReferralCodeDto } from './dto/apply-referral-code.dto';
import { ReferralService } from './referral.service';

@Controller('referrals')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('/me/code')
  @UseGuards(JwtAuthGuard)
  async getMyReferralCode(@CurrentUser() user: UserEntity) {
    const userId = user.id;
    const code = await this.referralService.getReferralCode(userId);
    return { referralCode: code };
  }

  @Post('/me/apply')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async applyReferralCode(
    @CurrentUser() user: UserEntity,
    @Body() body: ApplyReferralCodeDto,
  ): Promise<{ referrerUsername: string }> {
    const userId = user.id;
    const { referralCode } = body;

    const status = await this.referralService.getReferralStatus(userId);
    if (status.hasBeenReferred) {
      throw new ForbiddenException('User has already been referred.');
    }

    try {
      const result = await this.referralService.applyManualReferral(
        userId,
        referralCode,
      );
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException('Invalid referral code.');
      }
      if (error instanceof ForbiddenException) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  @Get('/me/status')
  @UseGuards(JwtAuthGuard)
  async getMyReferralStatus(
    @CurrentUser() user: UserEntity,
  ): Promise<{ hasBeenReferred: boolean; referrerUsername?: string }> {
    return this.referralService.getReferralStatus(user.id);
  }

  @Get('/me/history')
  @UseGuards(JwtAuthGuard)
  async getMyReferralHistory(
    @CurrentUser() user: UserEntity,
  ): Promise<Referral[]> {
    return this.referralService.getReferralsMadeByUser(user.id);
  }

  @Public()
  @Get('/leaderboard')
  async getReferralLeaderboard(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<PaginatedResult<ReferralLeaderboardEntry>> {
    const validLimit = Math.min(100, Math.max(1, limit));
    const validPage = Math.max(1, page);
    return this.referralService.getReferralLeaderboard(validPage, validLimit);
  }
}
