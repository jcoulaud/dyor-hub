import {
  CreditPackage,
  CreditTransaction,
  PaginatedResult,
  User as UserType,
} from '@dyor-hub/types';
import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserEntity } from '../entities/user.entity';
import { CreditsService } from './credits.service';
import { PurchaseCreditsDto } from './dto/purchase-credits.dto';

@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get('packages')
  async getAvailablePackages(): Promise<CreditPackage[]> {
    return this.creditsService.getAvailablePackages();
  }

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async purchaseCredits(
    @CurrentUser() userEntity: UserEntity,
    @Body() purchaseCreditsDto: PurchaseCreditsDto,
  ): Promise<UserType> {
    const updatedUserEntity = await this.creditsService.purchaseCredits(
      userEntity.id,
      purchaseCreditsDto.packageId,
      purchaseCreditsDto.solanaTransactionId,
    );

    const userToReturn: UserType = {
      id: updatedUserEntity.id,
      username: updatedUserEntity.username,
      displayName: updatedUserEntity.displayName,
      avatarUrl: updatedUserEntity.avatarUrl,
      bio: updatedUserEntity.bio ?? undefined,
      isAdmin: updatedUserEntity.isAdmin,
      preferences: updatedUserEntity.preferences,
      createdAt: updatedUserEntity.createdAt.toISOString(),
      credits: updatedUserEntity.credits,
    };

    return userToReturn;
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(
    @CurrentUser() user: UserEntity,
  ): Promise<{ credits: number }> {
    const balance = await this.creditsService.getUserBalance(user.id);
    return { credits: balance };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getHistory(
    @CurrentUser() user: UserEntity,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe)
    limit?: number,
  ): Promise<PaginatedResult<CreditTransaction>> {
    const result = await this.creditsService.getCreditHistory(
      user.id,
      page,
      limit,
    );

    const data = result.data.map((txEntity) => ({
      id: txEntity.id,
      userId: txEntity.userId,
      type: txEntity.type,
      amount: txEntity.amount,
      solanaTransactionId: txEntity.solanaTransactionId,
      details: txEntity.details,
      createdAt: txEntity.createdAt,
    }));

    return {
      data: data,
      meta: {
        total: result.total,
        page: result.currentPage,
        limit: limit ?? 10,
        totalPages: result.totalPages,
      },
    };
  }
}
