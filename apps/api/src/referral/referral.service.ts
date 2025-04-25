import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { nanoid } from 'nanoid';
import { Repository } from 'typeorm';
import { Referral } from '../entities/referral.entity';
import { UserEntity } from '../entities/user.entity';

const REFERRAL_CODE_LENGTH = 5;

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getReferralCode(userId: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      this.logger.error(`User not found for ID: ${userId}`);
      throw new NotFoundException('User not found');
    }

    if (user.referralCode) {
      return user.referralCode;
    }

    return this.generateAndAssignReferralCode(user);
  }

  private async generateAndAssignReferralCode(
    user: UserEntity,
  ): Promise<string> {
    let referralCode: string;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      referralCode = nanoid(REFERRAL_CODE_LENGTH);

      const existingUser = await this.userRepository.findOne({
        where: { referralCode },
        select: ['id'],
      });
      if (!existingUser) {
        break;
      }
      attempts++;
      this.logger.warn(
        `Referral code collision detected: ${referralCode}. Attempt ${attempts}`,
      );
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      this.logger.error(
        `Failed to generate a unique referral code for user ${user.id} after ${maxAttempts} attempts.`,
      );
      // Consider throwing an error or using a fallback mechanism
      throw new Error('Failed to generate unique referral code');
    }

    user.referralCode = referralCode;
    await this.userRepository.save(user);
    this.logger.log(
      `Assigned referral code ${referralCode} to user ${user.id}`,
    );
    return referralCode;
  }

  async processReferral(
    referralCode: string,
    referredUserId: string,
  ): Promise<void> {
    if (!referralCode) {
      return;
    }

    this.logger.log(
      `Processing referral: code=${referralCode}, newUserId=${referredUserId}`,
    );

    // 1. Find the referrer by their code
    const referrer = await this.userRepository.findOne({
      where: { referralCode },
    });

    if (!referrer) {
      this.logger.warn(
        `Referral code ${referralCode} not found for user ${referredUserId}.`,
      );
      return;
    }

    // 2. Basic validation
    if (referrer.id === referredUserId) {
      this.logger.warn(
        `User ${referredUserId} attempted to refer themselves with code ${referralCode}.`,
      );
      return;
    }

    // 3. Check if the new user has already been referred
    const existingReferral = await this.referralRepository.findOne({
      where: { referredUserId },
    });

    if (existingReferral) {
      this.logger.warn(
        `User ${referredUserId} has already been referred by user ${existingReferral.referrerId}.`,
      );
      return;
    }

    // 4. Create the referral link
    try {
      const newReferral = this.referralRepository.create({
        referrerId: referrer.id,
        referredUserId,
      });
      await this.referralRepository.save(newReferral);

      this.logger.log(
        `Referral successful: ${referrer.id} referred ${referredUserId}`,
      );

      // 5. Emit event for gamification/other listeners
      this.eventEmitter.emit('referral.successful', {
        referrerId: referrer.id,
        referredUserId,
        referralId: newReferral.id,
      });
    } catch (error) {
      if (error.code === '23505') {
        // Handle unique constraint violation (e.g., duplicate referredUserId)
        this.logger.warn(
          `Attempted to create duplicate referral for referredUserId: ${referredUserId}. Might be race condition. Error: ${error.message}`,
        );
      } else {
        this.logger.error(
          `Failed to save referral for ${referrer.id} -> ${referredUserId}: ${error.message}`,
        );
        throw error;
      }
    }
  }

  async applyManualReferral(
    userId: string,
    referralCode: string,
  ): Promise<void> {
    this.logger.log(
      `Processing manual referral application: userId=${userId}, code=${referralCode}`,
    );

    // 1. Check if user has already been referred
    const alreadyReferred = await this.hasBeenReferred(userId);
    if (alreadyReferred) {
      this.logger.warn(
        `User ${userId} attempted to apply code ${referralCode} but has already been referred.`,
      );
      throw new ForbiddenException('User has already been referred.');
    }

    // 2. Find the potential referrer by their code
    const referrer = await this.userRepository.findOne({
      where: { referralCode },
    });

    if (!referrer) {
      this.logger.warn(
        `Manual referral code ${referralCode} not found for applicant ${userId}.`,
      );
      throw new NotFoundException('Invalid referral code.');
    }

    // 3. Basic validation
    if (referrer.id === userId) {
      this.logger.warn(
        `User ${userId} attempted to apply their own code ${referralCode}.`,
      );
      throw new ForbiddenException('Cannot apply your own referral code.');
    }

    // 4. Create the referral link (Same logic as processReferral essentially)
    await this.processReferral(referralCode, userId);
  }

  async hasBeenReferred(userId: string): Promise<boolean> {
    const count = await this.referralRepository.count({
      where: { referredUserId: userId },
    });
    return count > 0;
  }

  async getReferralsMadeByUser(userId: string): Promise<Referral[]> {
    return this.referralRepository.find({
      where: { referrerId: userId },
      relations: ['referredUser'],
      order: { createdAt: 'DESC' },
    });
  }
}
