import { CreditTransactionType } from '@dyor-hub/types';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { PublicKey } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import { Repository } from 'typeorm';
import { CreditTransaction } from '../credits/entities/credit-transaction.entity';
import { AuthMethodEntity } from '../entities/auth-method.entity';
import { UserEntity } from '../entities/user.entity';
import { WalletEntity } from '../entities/wallet.entity';
import { GamificationEvent } from '../gamification/services/activity-hooks.service';
import { ReferralService } from '../referral/referral.service';
import { UploadsService } from '../uploads/uploads.service';
import { AuthConfigService } from './config/auth.config';
import {
  InvalidTokenException,
  TwitterTokenUpdateException,
  UserNotFoundException,
} from './exceptions/auth.exceptions';
import { JwtPayload, ValidateTwitterUserResult } from './interfaces/auth.types';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CreditTransaction)
    private readonly creditTransactionRepository: Repository<CreditTransaction>,
    @InjectRepository(AuthMethodEntity)
    private readonly authMethodRepository: Repository<AuthMethodEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    private readonly jwtService: JwtService,
    private readonly authConfigService: AuthConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly referralService: ReferralService,
    private readonly uploadsService: UploadsService,
  ) {}

  async validateTwitterUser(profile: any): Promise<ValidateTwitterUserResult> {
    const { id: twitterId, username, displayName, photos } = profile;

    const defaultAvatarUrl =
      'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
    const profileImageUrl = photos?.[0]?.value || defaultAvatarUrl;
    const safeDisplayName = displayName || username;

    let user = await this.userRepository.findOne({
      where: { twitterId },
    });

    let isNew = false;

    if (!user) {
      // Check if username already exists for non-Twitter users
      const normalizedUsername = username.toLowerCase().trim();
      const existingUser = await this.userRepository
        .createQueryBuilder('user')
        .where('LOWER(user.username) = :normalizedUsername', {
          normalizedUsername,
        })
        .andWhere('user.twitterId IS NULL OR user.twitterId != :twitterId', {
          twitterId,
        })
        .getOne();

      if (existingUser) {
        throw new ConflictException(
          `The username "${username}" is already taken. Please use a different Twitter username or contact support.`,
        );
      }

      isNew = true;
      user = this.userRepository.create({
        twitterId,
        username,
        displayName: safeDisplayName,
        avatarUrl: profileImageUrl,
        credits: 5,
      });
      await this.userRepository.save(user);

      const newCreditTransaction = this.creditTransactionRepository.create({
        userId: user.id,
        type: CreditTransactionType.PURCHASE,
        amount: 5,
        details: 'Welcome bonus: 5 credits upon signup',
      });
      await this.creditTransactionRepository.save(newCreditTransaction);
    } else {
      let needsSave = false;
      if (user.displayName !== safeDisplayName) {
        user.displayName = safeDisplayName;
        needsSave = true;
      }
      if (user.avatarUrl !== profileImageUrl) {
        user.avatarUrl = profileImageUrl;
        needsSave = true;
      }
      if (needsSave) {
        await this.userRepository.save(user);
      }
    }
    return { user, isNew };
  }

  async updateTwitterTokens(
    userId: string,
    accessToken: string,
    refreshToken?: string,
  ): Promise<void> {
    try {
      await this.userRepository.update(userId, {
        twitterAccessToken: accessToken,
        twitterRefreshToken: refreshToken || null,
      });
    } catch (error) {
      throw new TwitterTokenUpdateException(
        'Failed to update Twitter authentication tokens',
      );
    }
  }

  async login(user: UserEntity): Promise<string> {
    const payload = {
      sub: user.id,
      username: user.username,
    };

    this.eventEmitter.emit(GamificationEvent.USER_LOGGED_IN, {
      userId: user.id,
    });

    return this.jwtService.sign(payload, {
      secret: this.authConfigService.jwtSecret,
      expiresIn: this.authConfigService.jwtExpiresIn,
    });
  }

  async validateJwtPayload(payload: JwtPayload): Promise<UserEntity | null> {
    if (!payload?.sub) {
      throw new UserNotFoundException();
    }

    return this.userRepository.findOne({
      where: { id: payload.sub },
    });
  }

  async findUserById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  verifyToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.authConfigService.jwtSecret,
      });
    } catch (error) {
      throw new InvalidTokenException();
    }
  }

  async checkWalletAuth(walletAddress: string): Promise<any> {
    // Check if wallet is already used for authentication
    const existingAuthMethod = await this.authMethodRepository.findOne({
      where: { provider: 'wallet' as any, providerId: walletAddress },
      relations: ['user'],
    });

    if (existingAuthMethod?.user) {
      return {
        status: 'existing_user',
        user: existingAuthMethod.user,
      };
    }

    // Check if wallet exists in wallets table but without auth method
    const existingWallet = await this.walletRepository.findOne({
      where: { address: walletAddress },
      relations: ['user'],
    });

    if (existingWallet?.user) {
      // This wallet is linked to a user but not set up for authentication
      // Allow them to use it for auth by treating as existing user
      return {
        status: 'existing_user',
        user: existingWallet.user,
      };
    }

    return { status: 'new_wallet' };
  }

  async authenticateWithWallet(
    walletAddress: string,
    signature: string,
  ): Promise<UserEntity> {
    // Verify signature first
    const isValidSignature = await this.verifyWalletSignature(
      walletAddress,
      signature,
    );
    if (!isValidSignature) {
      throw new ConflictException('Invalid wallet signature');
    }

    // Check if this wallet is already an auth method
    const authMethod = await this.authMethodRepository.findOne({
      where: { provider: 'wallet' as any, providerId: walletAddress },
      relations: ['user'],
    });

    if (authMethod?.user) {
      return authMethod.user;
    }

    // Check if wallet exists in wallets table (user has wallet but no auth method yet)
    const existingWallet = await this.walletRepository.findOne({
      where: { address: walletAddress },
      relations: ['user'],
    });

    if (existingWallet?.user) {
      // Create auth method for this existing wallet
      const newAuthMethod = this.authMethodRepository.create({
        userId: existingWallet.user.id,
        provider: 'wallet' as any,
        providerId: walletAddress,
        isPrimary: false, // Don't override existing primary auth method
        metadata: { signature },
      });
      await this.authMethodRepository.save(newAuthMethod);

      return existingWallet.user;
    }

    throw new NotFoundException(
      'No account found for this wallet. Please sign up first.',
    );
  }

  async signupWithWallet(walletSignupData: any): Promise<UserEntity> {
    const {
      walletAddress,
      signature,
      username,
      displayName,
      avatarUrl,
      referralCode,
    } = walletSignupData;

    // Verify signature
    const isValidSignature = await this.verifyWalletSignature(
      walletAddress,
      signature,
    );
    if (!isValidSignature) {
      throw new ConflictException('Invalid wallet signature');
    }

    // Check if wallet is already used
    const authCheckResult = await this.checkWalletAuth(walletAddress);
    if (authCheckResult.status !== 'new_wallet') {
      throw new ConflictException(
        'This wallet is already associated with an account',
      );
    }

    // Check username uniqueness (case-insensitive)
    const normalizedUsername = username.toLowerCase().trim();
    const existingUser = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) = :normalizedUsername', {
        normalizedUsername,
      })
      .getOne();
    if (existingUser) {
      throw new ConflictException('Username is already taken');
    }

    // Confirm avatar upload and validate content
    let finalAvatarUrl = avatarUrl;
    if (avatarUrl && avatarUrl.includes('temp-uploads/')) {
      const urlParts = avatarUrl.split('/');
      const tempObjectKey = `images/temp-uploads/${urlParts.slice(-2).join('/')}`;
      finalAvatarUrl = await this.uploadsService.confirmUpload(tempObjectKey);
    }

    // Create user
    const user = this.userRepository.create({
      username,
      displayName,
      avatarUrl: finalAvatarUrl,
      credits: 5,
      twitterId: null, // No Twitter ID for wallet-only users
    });
    await this.userRepository.save(user);

    // Create auth method
    const authMethod = this.authMethodRepository.create({
      userId: user.id,
      provider: 'wallet' as any,
      providerId: walletAddress,
      isPrimary: true,
      metadata: { signature },
    });
    await this.authMethodRepository.save(authMethod);

    // Create wallet entry (verified and primary by default)
    const wallet = this.walletRepository.create({
      address: walletAddress,
      userId: user.id,
      isVerified: true,
      isPrimary: true,
      signature,
    });
    await this.walletRepository.save(wallet);

    // Grant welcome credit bonus
    const creditTransaction = this.creditTransactionRepository.create({
      userId: user.id,
      type: CreditTransactionType.PURCHASE,
      amount: 5,
      details: 'Welcome bonus: 5 credits upon signup',
    });
    await this.creditTransactionRepository.save(creditTransaction);

    // Process referral if provided
    if (referralCode) {
      try {
        await this.referralService.processReferral(referralCode, user.id);
      } catch (error) {
        console.error('Failed to process referral code:', error);
      }
    }

    return user;
  }

  async linkAuthMethod(
    userId: string,
    linkAuthMethodDto: any,
  ): Promise<{ success: boolean; message: string }> {
    const { provider } = linkAuthMethodDto;

    if (provider === 'twitter') {
      throw new ConflictException(
        'Twitter linking must be done through the OAuth flow. Please use the Connect Twitter button in your account settings.',
      );
    } else if (provider === 'wallet') {
      const { walletAddress, signature } = linkAuthMethodDto;

      // Verify signature
      const isValidSignature = await this.verifyWalletSignature(
        walletAddress,
        signature,
      );
      if (!isValidSignature) {
        throw new ConflictException('Invalid wallet signature');
      }

      // Check if this wallet is already linked to another user
      const existingAuthMethod = await this.authMethodRepository.findOne({
        where: { provider: 'wallet' as any, providerId: walletAddress },
      });

      if (existingAuthMethod && existingAuthMethod.userId !== userId) {
        throw new ConflictException(
          'This wallet is already linked to another account',
        );
      }

      // Check if this user already has this wallet linked
      if (existingAuthMethod && existingAuthMethod.userId === userId) {
        return {
          success: true,
          message: 'Wallet is already linked to your account',
        };
      }

      // Create new auth method
      const authMethod = this.authMethodRepository.create({
        userId,
        provider: 'wallet' as any,
        providerId: walletAddress,
        isPrimary: false, // Don't override existing primary auth method
        metadata: { signature },
      });
      await this.authMethodRepository.save(authMethod);

      return {
        success: true,
        message: 'Wallet successfully linked to your account',
      };
    }

    throw new ConflictException('Unsupported auth method provider');
  }

  async getUserAuthMethods(userId: string): Promise<
    Array<{
      id: string;
      provider: string;
      providerId: string;
      isPrimary: boolean;
      createdAt: string;
    }>
  > {
    const authMethods = await this.authMethodRepository.find({
      where: { userId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });

    return authMethods.map((method) => ({
      id: method.id,
      provider: method.provider,
      providerId: method.providerId,
      isPrimary: method.isPrimary,
      createdAt: method.createdAt.toISOString(),
    }));
  }

  async removeAuthMethod(
    userId: string,
    authMethodId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Get all user's auth methods
    const userAuthMethods = await this.authMethodRepository.find({
      where: { userId },
    });

    // Check if user has more than one auth method
    if (userAuthMethods.length <= 1) {
      throw new ConflictException(
        'Cannot remove the only authentication method. You must have at least one way to sign in.',
      );
    }

    // Find the specific auth method to remove
    const authMethodToRemove = userAuthMethods.find(
      (method) => method.id === authMethodId,
    );

    if (!authMethodToRemove) {
      throw new NotFoundException('Authentication method not found');
    }

    // Check if this belongs to the user
    if (authMethodToRemove.userId !== userId) {
      throw new ConflictException(
        'You can only remove your own authentication methods',
      );
    }

    // Remove the auth method
    await this.authMethodRepository.remove(authMethodToRemove);

    // If we removed a Twitter auth method, also clear the user's Twitter ID if no other Twitter auth exists
    if (authMethodToRemove.provider === 'twitter') {
      const remainingTwitterMethods = await this.authMethodRepository.findOne({
        where: { userId, provider: 'twitter' as any },
      });

      if (!remainingTwitterMethods) {
        const user = await this.userRepository.findOne({
          where: { id: userId },
        });
        if (user && user.twitterId) {
          user.twitterId = null;
          await this.userRepository.save(user);
        }
      }
    }

    const providerName =
      authMethodToRemove.provider === 'twitter' ? 'Twitter' : 'Wallet';
    return {
      success: true,
      message: `${providerName} authentication method removed successfully`,
    };
  }

  async linkTwitterToUser(userId: string, twitterProfile: any): Promise<void> {
    // Check if this Twitter account is already linked to another user
    const existingAuthMethod = await this.authMethodRepository.findOne({
      where: { provider: 'twitter' as any, providerId: twitterProfile.id },
    });

    if (existingAuthMethod && existingAuthMethod.userId !== userId) {
      throw new ConflictException(
        'This Twitter account is already linked to another user',
      );
    }

    // Check if this user already has this Twitter account linked
    if (existingAuthMethod && existingAuthMethod.userId === userId) {
      return; // Already linked, nothing to do
    }

    // Get the user to update their Twitter ID if they don't have one
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create auth method
    const authMethod = this.authMethodRepository.create({
      userId,
      provider: 'twitter' as any,
      providerId: twitterProfile.id,
      isPrimary: false, // Don't override existing primary auth method
      metadata: {
        username: twitterProfile.username,
        displayName: twitterProfile.displayName,
      },
    });
    await this.authMethodRepository.save(authMethod);

    // Update user's Twitter ID if they don't have one
    if (!user.twitterId) {
      user.twitterId = twitterProfile.id;
      await this.userRepository.save(user);
    }
  }

  private async verifyWalletSignature(
    walletAddress: string,
    signature: string,
  ): Promise<boolean> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const signatureBytes = Buffer.from(signature, 'base64');

      // Create the message that should have been signed (without timestamp to avoid mismatch)
      const message = `Sign this message to authenticate with DYOR Hub.\n\nWallet: ${walletAddress}`;
      const messageBytes = new TextEncoder().encode(message);

      return nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes(),
      );
    } catch (error) {
      return false;
    }
  }
}
