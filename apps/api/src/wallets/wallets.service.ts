import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PublicKey } from '@solana/web3.js';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import * as nacl from 'tweetnacl';
import { Not, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { WalletEntity } from '../entities/wallet.entity';
import { SolanaRpcService } from '../solana/solana-rpc.service';
import { ConnectWalletDto } from './dto/connect-wallet.dto';
import { GenerateNonceDto } from './dto/generate-nonce.dto';
import { NonceResponseDto } from './dto/nonce-response.dto';
import { VerifyWalletDto } from './dto/verify-wallet.dto';
import { WalletResponseDto } from './dto/wallet-response.dto';

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    @InjectRepository(WalletEntity)
    private walletsRepository: Repository<WalletEntity>,
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly solanaRpcService: SolanaRpcService,
  ) {}

  async connectWallet(
    userId: string,
    connectWalletDto: ConnectWalletDto,
  ): Promise<WalletResponseDto> {
    const { address } = connectWalletDto;

    let wallet = await this.walletsRepository.findOne({
      where: { address },
    });

    if (wallet) {
      if (wallet.userId !== userId) {
        throw new ConflictException(
          'Wallet address already connected to another account',
        );
      }
      return WalletResponseDto.fromEntity(wallet);
    }

    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

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
      throw new Error(`Invalid Solana address format: ${error.message}`);
    }

    const wallet = await this.walletsRepository.findOne({
      where: { address, userId },
    });

    if (!wallet) {
      throw new NotFoundException(
        'Wallet not found. Please connect the wallet first.',
      );
    }

    // Generate a secure random nonce
    const nonce = `DYOR-${Date.now()}-${crypto.randomInt(100000, 999999)}`;
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 min expiration

    wallet.verificationNonce = nonce;
    wallet.nonceExpiresAt = expiresAt;
    await this.walletsRepository.save(wallet);

    return { nonce, expiresAt };
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
      throw new NotFoundException(
        'Wallet not found or not associated with this user account.',
      );
    }

    // Check if already verified by another user
    const conflictingWallet = await this.walletsRepository.findOne({
      where: {
        address: address,
        isVerified: true,
        userId: Not(userId),
      },
    });

    if (conflictingWallet) {
      throw new ConflictException('Wallet already verified by another user.');
    }

    // Check nonce presence and expiration
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

    // Verify signature
    try {
      const signatureBytes = Buffer.from(signature, 'base64');

      const publicKey = new PublicKey(address);
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

      // Update wallet state on successful verification
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
    if (!userId) return [];
    const wallets = await this.walletsRepository.find({ where: { userId } });
    return wallets.map((wallet) => WalletResponseDto.fromEntity(wallet));
  }

  async deleteWallet(userId: string, walletId: string): Promise<void> {
    const result = await this.walletsRepository.delete({
      id: walletId,
      userId,
    });
    if (result.affected === 0) {
      throw new NotFoundException(
        'Wallet not found or you do not own this wallet.',
      );
    }
  }

  async setPrimaryWallet(
    userId: string,
    walletId: string,
  ): Promise<WalletResponseDto> {
    const walletToMakePrimary = await this.walletsRepository.findOne({
      where: { id: walletId, userId },
    });

    if (!walletToMakePrimary) {
      throw new NotFoundException('Wallet not found for this user.');
    }

    return this.walletsRepository.manager.transaction(async (manager) => {
      await manager.update(
        WalletEntity,
        { userId: userId },
        { isPrimary: false },
      );

      walletToMakePrimary.isPrimary = true;
      const updatedWallet = await manager.save(walletToMakePrimary);

      return WalletResponseDto.fromEntity(updatedWallet);
    });
  }

  async getUserPrimaryWallet(userId: string): Promise<WalletEntity | null> {
    return this.walletsRepository.findOne({
      where: { userId: userId, isPrimary: true, isVerified: true },
    });
  }

  async getSplTokenBalance(
    walletAddress: string,
    tokenMintAddress: string,
  ): Promise<number> {
    const cacheKey = `wallet:${walletAddress}:balance:${tokenMintAddress}`;
    try {
      const cachedBalance = await this.cacheManager.get<number>(cacheKey);
      if (cachedBalance !== undefined && cachedBalance !== null) {
        return cachedBalance;
      }

      const connection = this.solanaRpcService.getConnection();
      const walletPublicKey = new PublicKey(walletAddress);
      const tokenMintPublicKey = new PublicKey(tokenMintAddress);

      const tokenAccounts = await connection.getTokenAccountsByOwner(
        walletPublicKey,
        { mint: tokenMintPublicKey },
      );

      if (tokenAccounts.value.length === 0) {
        this.logger.warn(
          `No token account found for mint ${tokenMintAddress} in wallet ${walletAddress}`,
        );
        await this.cacheManager.set(cacheKey, 0, 180 * 1000);
        return 0;
      }

      const associatedTokenAccount = tokenAccounts.value[0].pubkey;

      const balanceResponse = await connection.getTokenAccountBalance(
        associatedTokenAccount,
      );

      const balance = balanceResponse.value.uiAmount ?? 0;

      await this.cacheManager.set(cacheKey, balance, 180 * 1000);

      return balance;
    } catch (error) {
      this.logger.error(
        `Failed to get SPL token balance for ${walletAddress} / ${tokenMintAddress}: ${error.message}`,
        error.stack,
      );
      await this.cacheManager.set(cacheKey, 0, 60 * 1000);
      return 0;
    }
  }
}
