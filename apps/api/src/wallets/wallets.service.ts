import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PublicKey } from '@solana/web3.js';
import * as crypto from 'crypto';
import * as nacl from 'tweetnacl';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { WalletEntity } from '../entities/wallet.entity';
import { ConnectWalletDto } from './dto/connect-wallet.dto';
import { GenerateNonceDto } from './dto/generate-nonce.dto';
import { NonceResponseDto } from './dto/nonce-response.dto';
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

  async generateNonce(
    userId: string,
    generateNonceDto: GenerateNonceDto,
  ): Promise<NonceResponseDto> {
    const { address } = generateNonceDto;

    try {
      const publicKey = new PublicKey(address);
      if (!PublicKey.isOnCurve(publicKey)) {
        throw new Error('Invalid Solana address: not on Ed25519 curve');
      }
    } catch (error) {
      throw new Error(`Invalid Solana address: ${error.message}`);
    }

    const wallet = await this.walletsRepository.findOne({
      where: { address, userId },
    });

    if (!wallet) {
      throw new Error('Wallet not found. Please connect the wallet first.');
    }

    const nonce = `DYOR-${Date.now()}-${crypto.randomInt(100000, 999999)}`;

    // Nonce expiration (15 minutes from now)
    const expiresAt = Date.now() + 15 * 60 * 1000;

    wallet.verificationNonce = nonce;
    wallet.nonceExpiresAt = expiresAt;

    await this.walletsRepository.save(wallet);

    return {
      nonce,
      expiresAt,
    };
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

    try {
      const signatureBytes = Buffer.from(signature, 'base64');

      const publicKey = new PublicKey(address);

      if (!PublicKey.isOnCurve(publicKey)) {
        throw new Error('Invalid Solana address: not on Ed25519 curve');
      }

      if (!wallet.verificationNonce) {
        throw new Error(
          'No verification nonce found. Please request a new nonce first.',
        );
      }

      if (wallet.nonceExpiresAt && wallet.nonceExpiresAt < Date.now()) {
        throw new Error(
          'Verification nonce has expired. Please request a new nonce.',
        );
      }

      const message = `Sign this message to verify ownership of your wallet with DYOR hub.\n\nNonce: ${wallet.verificationNonce}`;
      const messageBytes = new TextEncoder().encode(message);

      const verified = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes(),
      );

      if (!verified) {
        throw new Error('Signature verification failed');
      }

      wallet.isVerified = true;
      wallet.signature = signature;
      wallet.verificationNonce = null;
      wallet.nonceExpiresAt = null;

      await this.walletsRepository.save(wallet);
      return WalletResponseDto.fromEntity(wallet);
    } catch (error) {
      throw new Error(`Wallet verification failed: ${error.message}`);
    }
  }

  async getUserWallets(userId: string): Promise<WalletResponseDto[]> {
    if (!userId) {
      return [];
    }

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
