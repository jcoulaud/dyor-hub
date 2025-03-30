import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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

      // Only return wallets that are both primary and verified
      const primaryWallet = wallets.find(
        (wallet) => wallet.isPrimary && wallet.isVerified,
      );

      return primaryWallet
        ? {
            address: primaryWallet.address,
            isVerified: primaryWallet.isVerified,
          }
        : null;
    } catch (error) {
      console.error('Error getting public wallet info:', error);
      return null;
    }
  }
}

// Private controller - requires authentication
@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

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
    try {
      return await this.walletsService.generateNonce(user.id, generateNonceDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to generate verification nonce',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
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
    try {
      const wallet = await this.walletsService.setPrimaryWallet(
        user.id,
        walletId,
      );
      return {
        success: true,
        isPrimary: wallet.isPrimary,
      };
    } catch (error) {
      console.error(`Error in setPrimaryWallet controller: ${error.message}`);
      throw new HttpException(
        error.message || 'Could not set wallet as primary',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async deleteWallet(
    @CurrentUser() user: UserEntity,
    @Param('id') walletId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.walletsService.deleteWallet(user.id, walletId);
      return {
        success: true,
        message: 'Wallet deleted successfully',
      };
    } catch (error) {
      console.error(`Error in deleteWallet controller: ${error.message}`);
      throw new HttpException(
        error.message || 'Could not delete wallet',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
