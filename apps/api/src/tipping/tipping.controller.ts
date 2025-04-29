import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Tip } from '../entities/tip.entity';
import { UserEntity } from '../entities/user.entity';
import { GetTippingEligibilityResponseDto } from './dto/get-tipping-eligibility-response.dto';
import { GetTippingStatsResponseDto } from './dto/get-tipping-stats-response.dto';
import { RecordTipRequestDto } from './dto/record-tip-request.dto';
import { TippingService } from './tipping.service';

@Controller('tipping')
export class TippingController {
  constructor(private readonly tippingService: TippingService) {}

  @Get('eligibility/:userId')
  async getEligibility(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<GetTippingEligibilityResponseDto> {
    return this.tippingService.getTippingEligibility(userId);
  }

  @Post('record')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async recordTip(
    @CurrentUser() user: UserEntity,
    @Body() recordTipDto: RecordTipRequestDto,
  ): Promise<Tip> {
    const senderUserId = user.id;
    return this.tippingService.recordTip(senderUserId, recordTipDto);
  }

  @Get('stats/:userId')
  async getStats(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<GetTippingStatsResponseDto> {
    return this.tippingService.getUserTippingStats(userId);
  }
}
