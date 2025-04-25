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
  @HttpCode(HttpStatus.NO_CONTENT)
  async applyReferralCode(
    @CurrentUser() user: UserEntity,
    @Body() body: ApplyReferralCodeDto,
  ) {
    const userId = user.id;
    const { referralCode } = body;

    // Check if user has already been referred
    const alreadyReferred = await this.referralService.hasBeenReferred(userId);
    if (alreadyReferred) {
      throw new ForbiddenException('User has already been referred.');
    }

    try {
      await this.referralService.applyManualReferral(userId, referralCode);
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
}
