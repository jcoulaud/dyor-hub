import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
}
