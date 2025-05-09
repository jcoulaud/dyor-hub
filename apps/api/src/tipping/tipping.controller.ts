import { PaginatedResult, Tip } from '@dyor-hub/types';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Tip as TipEntity } from '../entities/tip.entity';
import { UserEntity } from '../entities/user.entity';
import { GetTippingEligibilityResponseDto } from './dto/get-tipping-eligibility-response.dto';
import { RecordTipRequestDto } from './dto/record-tip-request.dto';
import { TipPaginationQueryDto } from './dto/tip-pagination-query.dto';
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
  ): Promise<TipEntity> {
    const senderUserId = user.id;
    return this.tippingService.recordTip(senderUserId, recordTipDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserTips(
    @CurrentUser() user: UserEntity,
    @Query() query: TipPaginationQueryDto,
  ): Promise<PaginatedResult<Tip>> {
    const userId = user.id;
    return this.tippingService.findUserTips(userId, query);
  }
}
