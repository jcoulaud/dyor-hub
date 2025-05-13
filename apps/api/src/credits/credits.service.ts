import { CreditTransactionType as DyorHubCreditTransactionType } from '@dyor-hub/types';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, ParsedTransactionWithMeta } from '@solana/web3.js';
import { Repository } from 'typeorm';
import { DYORHUB_MARKETING_ADDRESS } from '../common/constants';
import { UserEntity } from '../entities/user.entity';
import { SolanaRpcService } from '../solana/solana-rpc.service';
import { CreateCreditPackageDto } from './dto/create-credit-package.dto';
import { UpdateCreditPackageDto } from './dto/update-credit-package.dto';
import { CreditPackage } from './entities/credit-package.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(
    @InjectRepository(CreditPackage)
    private readonly creditPackageRepository: Repository<CreditPackage>,
    @InjectRepository(CreditTransaction)
    private readonly creditTransactionRepository: Repository<CreditTransaction>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly solanaRpcService: SolanaRpcService,
  ) {}

  async getAvailablePackages(): Promise<CreditPackage[]> {
    return this.creditPackageRepository.find({
      where: { isActive: true },
      order: { credits: 'ASC' },
    });
  }

  async purchaseCredits(
    userId: string,
    packageId: string,
    solanaTransactionId: string,
  ): Promise<UserEntity> {
    const queryRunner =
      this.creditTransactionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Find package within the transaction
      const creditPackage = await queryRunner.manager.findOneBy(CreditPackage, {
        id: packageId,
        isActive: true,
      });
      if (!creditPackage) {
        throw new NotFoundException('Active credit package not found.');
      }

      // 2. Verify Solana transaction
      const connection = this.solanaRpcService.getConnection();
      const txDetails = await this.verifySolPurchaseTransaction(
        connection,
        solanaTransactionId,
        creditPackage.solPrice,
        DYORHUB_MARKETING_ADDRESS,
      );

      // Check if tx is valid and doesn't have errors
      if (!txDetails || txDetails.meta?.err) {
        this.logger.error(
          `SOL Purchase Transaction verification failed or tx has error for ${solanaTransactionId}`,
          { error: txDetails?.meta?.err },
        );
        throw new BadRequestException(
          `Transaction verification failed or transaction has an error: ${solanaTransactionId}`,
        );
      }

      // 3. Check if transaction already processed
      const existingTransaction = await queryRunner.manager.findOneBy(
        CreditTransaction,
        {
          solanaTransactionId,
        },
      );
      if (existingTransaction) {
        this.logger.warn(
          `Credit purchase with signature ${solanaTransactionId} already recorded.`,
        );

        throw new BadRequestException(
          `Transaction ${solanaTransactionId} already processed.`,
        );
      }

      // 4. Find user and update credits within the transaction
      const user = await queryRunner.manager.findOneBy(UserEntity, {
        id: userId,
      });
      if (!user) {
        throw new NotFoundException('User not found.');
      }

      user.credits += creditPackage.credits;
      await queryRunner.manager.save(UserEntity, user);

      // 5. Record transaction within the database transaction
      const transaction = queryRunner.manager.create(CreditTransaction, {
        userId,
        type: DyorHubCreditTransactionType.PURCHASE,
        amount: creditPackage.credits,
        solanaTransactionId,
        details: `Purchased ${creditPackage.name}`,
      });
      await queryRunner.manager.save(CreditTransaction, transaction);

      await queryRunner.commitTransaction();
      return user;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed during credit purchase for user ${userId}: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to purchase credits.');
    } finally {
      await queryRunner.release();
    }
  }

  async deductCredits(
    userId: string,
    cost: number,
    reason: string,
  ): Promise<void> {
    if (cost <= 0) {
      this.logger.warn(
        `Attempted to deduct non-positive credit cost (${cost}) for user ${userId}`,
      );
      return;
    }

    const queryRunner =
      this.creditTransactionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOneBy(UserEntity, {
        id: userId,
      });
      if (!user) {
        throw new NotFoundException('User not found.');
      }

      if (user.credits < cost) {
        throw new BadRequestException('Insufficient credits.');
      }

      // Use query builder for atomic update to prevent race conditions
      await queryRunner.manager.decrement(
        UserEntity,
        { id: userId },
        'credits',
        cost,
      );

      // Record the usage transaction
      const transaction = queryRunner.manager.create(CreditTransaction, {
        userId,
        type: DyorHubCreditTransactionType.USAGE,
        amount: -cost,
        details: reason,
      });
      await queryRunner.manager.save(CreditTransaction, transaction);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to deduct ${cost} credits for user ${userId}: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to deduct credits.');
    } finally {
      await queryRunner.release();
    }
  }

  async getUserBalance(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['credits'],
    });
    if (!user) {
      this.logger.warn(
        `User balance requested for non-existent user: ${userId}`,
      );
      throw new NotFoundException('User not found.');
    }
    return user.credits;
  }

  async getCreditHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: CreditTransaction[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const skip = (page - 1) * limit;
    const [transactions, total] =
      await this.creditTransactionRepository.findAndCount({
        where: { userId },
        order: { createdAt: 'DESC' },
        skip: skip,
        take: limit,
      });

    const totalPages = Math.ceil(total / limit);

    return {
      data: transactions,
      total,
      totalPages,
      currentPage: page,
    };
  }

  private async verifySolPurchaseTransaction(
    connection: Connection,
    signature: string,
    expectedSolAmount: number,
    projectWalletAddress: string,
  ): Promise<ParsedTransactionWithMeta | null> {
    const LAMPORTS_PER_SOL = 1_000_000_000;
    const expectedLamports = Math.round(expectedSolAmount * LAMPORTS_PER_SOL);

    try {
      const tx = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!tx) {
        this.logger.warn(`Transaction ${signature} not found on-chain.`);
        return null;
      }

      if (tx.meta?.err) {
        this.logger.warn(
          `Transaction ${signature} failed with error: ${JSON.stringify(tx.meta.err)}`,
        );
        return tx;
      }

      let transferVerified = false;
      for (const instruction of tx.transaction.message.instructions) {
        if (
          'parsed' in instruction &&
          instruction.program === 'system' &&
          instruction.parsed.type === 'transfer'
        ) {
          const parsedInfo = instruction.parsed.info;

          if (
            parsedInfo.destination === projectWalletAddress &&
            parsedInfo.lamports === expectedLamports
          ) {
            transferVerified = true;
            break;
          }
        }
      }

      if (!transferVerified) {
        this.logger.warn(
          `Could not verify correct SOL transfer instruction in tx ${signature}. Expected ${expectedLamports} lamports to ${projectWalletAddress}. Tx instructions: ${JSON.stringify(tx.transaction.message.instructions)}`,
        );
        return null;
      }

      return tx;
    } catch (error) {
      this.logger.error(
        `Error fetching or parsing SOL transaction ${signature}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  async findAllPackages(
    includeInactive: boolean = false,
  ): Promise<CreditPackage[]> {
    const whereCondition: { isActive?: boolean } = {};
    if (!includeInactive) {
      whereCondition.isActive = true;
    }
    return this.creditPackageRepository.find({
      where: whereCondition,
      order: { credits: 'ASC' },
    });
  }

  async createPackage(
    createDto: CreateCreditPackageDto,
  ): Promise<CreditPackage> {
    const newPackage = this.creditPackageRepository.create(createDto);
    return this.creditPackageRepository.save(newPackage);
  }

  async updatePackage(
    id: string,
    updateDto: UpdateCreditPackageDto,
  ): Promise<CreditPackage> {
    const existingPackage = await this.creditPackageRepository.findOneBy({
      id,
    });
    if (!existingPackage) {
      throw new NotFoundException(`Credit package with ID "${id}" not found`);
    }

    const updatedPackage = this.creditPackageRepository.merge(
      existingPackage,
      updateDto,
    );

    return this.creditPackageRepository.save(updatedPackage);
  }

  async deletePackage(id: string): Promise<void> {
    const result = await this.creditPackageRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Credit package with ID "${id}" not found`);
    }
  }

  async checkAndReserveCredits(userId: string, amount: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.credits < amount) {
      throw new BadRequestException('Insufficient credits');
    }

    // Reserve credits by deducting them temporarily
    await this.userRepository
      .createQueryBuilder()
      .update(UserEntity)
      .set({
        credits: () => `credits - ${amount}`,
      })
      .where('id = :userId', { userId })
      .execute();
  }

  async commitReservedCredits(
    userId: string,
    amount: number,
    description?: string,
  ): Promise<void> {
    // Create the transaction record
    await this.creditTransactionRepository.save({
      userId,
      amount: -amount,
      details: description || 'Credit deduction',
      type: DyorHubCreditTransactionType.USAGE,
    });
  }

  async releaseReservedCredits(userId: string, amount: number): Promise<void> {
    // Return reserved credits back to available credits
    await this.userRepository
      .createQueryBuilder()
      .update(UserEntity)
      .set({
        credits: () => `credits + ${amount}`,
      })
      .where('id = :userId', { userId })
      .execute();
  }
}
