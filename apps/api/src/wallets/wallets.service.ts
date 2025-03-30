import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { WalletEntity } from '../entities/wallet.entity';
import { ConnectWalletDto } from './dto/connect-wallet.dto';
import { VerifyWalletDto } from './dto/verify-wallet.dto';
import { WalletResponseDto } from './dto/wallet-response.dto';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(WalletEntity)
    private walletsRepository: Repository<WalletEntity>,
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}

  async connectWallet(
    userId: string,
    connectWalletDto: ConnectWalletDto,
  ): Promise<WalletResponseDto> {
    const { address } = connectWalletDto;

    // Check if wallet already exists for this address
    let wallet = await this.walletsRepository.findOne({
      where: { address },
    });

    if (wallet) {
      // If wallet exists but belongs to another user, throw an error
      if (wallet.userId !== userId) {
        throw new Error('Wallet address already connected to another account');
      }
      return WalletResponseDto.fromEntity(wallet);
    }

    // Create new wallet
    const user = await this.usersRepository.findOneOrFail({
      where: { id: userId },
    });

    wallet = this.walletsRepository.create({
      address,
      isVerified: false,
      user,
    });

    await this.walletsRepository.save(wallet);
    return WalletResponseDto.fromEntity(wallet);
  }

  async verifyWallet(
    userId: string,
    verifyWalletDto: VerifyWalletDto,
  ): Promise<WalletResponseDto> {
    const { address, signature } = verifyWalletDto;

    const wallet = await this.walletsRepository.findOne({
      where: { address, userId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // In a real implementation, we would verify the signature here
    // This is a simplified version that just accepts any signature
    wallet.isVerified = true;
    wallet.signature = signature;

    await this.walletsRepository.save(wallet);
    return WalletResponseDto.fromEntity(wallet);
  }

  async getUserWallets(userId: string): Promise<WalletResponseDto[]> {
    const wallets = await this.walletsRepository.find({
      where: { userId },
    });

    return wallets.map((wallet) => WalletResponseDto.fromEntity(wallet));
  }

  async deleteWallet(userId: string, walletId: string): Promise<void> {
    const wallet = await this.walletsRepository.findOne({
      where: { id: walletId, userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    await this.walletsRepository.remove(wallet);
  }

  async setPrimaryWallet(
    userId: string,
    walletId: string,
  ): Promise<WalletResponseDto> {
    const wallet = await this.walletsRepository.findOne({
      where: { id: walletId, userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.walletsRepository.manager.transaction(async (manager) => {
      await manager.query(
        `UPDATE wallets SET is_primary = false WHERE user_id = $1`,
        [userId],
      );

      wallet.isPrimary = true;
      const updatedWallet = await manager.save(wallet);

      return WalletResponseDto.fromEntity(updatedWallet);
    });
  }
}
