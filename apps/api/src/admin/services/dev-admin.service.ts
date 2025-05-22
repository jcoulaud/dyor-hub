import { CreditTransactionType } from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreditTransaction } from '../../credits/entities/credit-transaction.entity';
import { TokenEntity, UserEntity } from '../../entities';

@Injectable()
export class DevAdminService {
  private readonly logger = new Logger(DevAdminService.name);

  constructor(
    @InjectRepository(TokenEntity)
    private readonly dataSource: DataSource,
  ) {}

  async addCreditsToAllUsers(
    creditsToAdd: number,
  ): Promise<{ affected: number; transactionsCreated: number }> {
    let affectedCount = 0;
    let transactionsCount = 0;

    await this.dataSource.transaction(async (transactionalEntityManager) => {
      const users = await transactionalEntityManager.find(UserEntity);
      affectedCount = users.length;

      for (const user of users) {
        user.credits = (user.credits || 0) + creditsToAdd;
        await transactionalEntityManager.save(UserEntity, user);

        const newTransaction = transactionalEntityManager.create(
          CreditTransaction,
          {
            userId: user.id,
            type: CreditTransactionType.PURCHASE,
            amount: creditsToAdd,
            details: `User Airdrop: ${creditsToAdd} credits sent to everyone on the platform`,
          },
        );
        await transactionalEntityManager.save(
          CreditTransaction,
          newTransaction,
        );
        transactionsCount++;
      }
    });

    this.logger.log(
      `Added ${creditsToAdd} credits to ${affectedCount} users and created ${transactionsCount} transactions via Dev Admin.`,
    );
    return { affected: affectedCount, transactionsCreated: transactionsCount };
  }
}
