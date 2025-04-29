import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DYORHUB_CONTRACT_ADDRESS } from '../common/constants';
import { UserEntity } from '../entities/user.entity';
import { ConnectWalletDto } from './dto/connect-wallet.dto';
import { GenerateNonceDto } from './dto/generate-nonce.dto';
import { NonceResponseDto } from './dto/nonce-response.dto';
import { VerifyWalletDto } from './dto/verify-wallet.dto';
import { WalletResponseDto } from './dto/wallet-response.dto';
import { WalletsService } from './wallets.service';

// Public controller - no auth guard
@Controller('public-wallets')
export class WalletsPublicController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get(':userId')
  async getPublicWalletInfo(
    @Param('userId') userId: string,
  ): Promise<{ address: string; isVerified: boolean } | null> {
    try {
      const wallets = await this.walletsService.getUserWallets(userId);
      const primaryWallet = wallets.find(
        (wallet) => wallet.isPrimary && wallet.isVerified,
      );
      return primaryWallet
        ? { address: primaryWallet.address, isVerified: true }
        : null;
    } catch (error) {
      return null;
    }
  }
}

// Private controller - requires authentication
@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('me/dyorhub-balance')
  async getMyDyorhubBalance(
    @CurrentUser() user: UserEntity,
  ): Promise<{ balance: number }> {
    const primaryWallet = await this.walletsService.getUserPrimaryWallet(
      user.id,
    );
    if (!primaryWallet) {
      throw new NotFoundException(
        'Primary verified wallet not found for user.',
      );
    }
    const balance = await this.walletsService.getSplTokenBalance(
      primaryWallet.address,
      DYORHUB_CONTRACT_ADDRESS,
    );
    const numericBalance =
      typeof balance === 'bigint' ? Number(balance) : Number(balance);
    return { balance: numericBalance };
  }

  @Post('connect')
  async connectWallet(
    @CurrentUser() user: UserEntity,
    @Body() connectWalletDto: ConnectWalletDto,
  ): Promise<WalletResponseDto> {
    return this.walletsService.connectWallet(user.id, connectWalletDto);
  }

  @Post('generate-nonce')
  async generateNonce(
    @CurrentUser() user: UserEntity,
    @Body() generateNonceDto: GenerateNonceDto,
  ): Promise<NonceResponseDto> {
    return this.walletsService.generateNonce(user.id, generateNonceDto);
  }

  @Post('verify')
  async verifyWallet(
    @CurrentUser() user: UserEntity,
    @Body() verifyWalletDto: VerifyWalletDto,
  ): Promise<WalletResponseDto> {
    return this.walletsService.verifyWallet(user.id, verifyWalletDto);
  }

  @Get()
  async getUserWallets(
    @CurrentUser() user: UserEntity,
  ): Promise<WalletResponseDto[]> {
    return this.walletsService.getUserWallets(user.id);
  }

  @Post(':id/primary')
  async setPrimaryWallet(
    @CurrentUser() user: UserEntity,
    @Param('id') walletId: string,
  ): Promise<{ success: boolean; isPrimary: boolean }> {
    const wallet = await this.walletsService.setPrimaryWallet(
      user.id,
      walletId,
    );
    return { success: true, isPrimary: wallet.isPrimary };
  }

  @Delete(':id')
  async deleteWallet(
    @CurrentUser() user: UserEntity,
    @Param('id') walletId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.walletsService.deleteWallet(user.id, walletId);
    return { success: true, message: 'Wallet deleted successfully' };
  }
}
