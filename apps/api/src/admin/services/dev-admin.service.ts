import { CreditTransactionType } from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CreditTransaction } from '../../credits/entities/credit-transaction.entity';
import { TokenEntity, UserEntity } from '../../entities';
import { TokensService } from '../../tokens/tokens.service';

@Injectable()
export class DevAdminService {
  private readonly logger = new Logger(DevAdminService.name);

  constructor(
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
    private readonly tokensService: TokensService,
    private readonly entityManager: EntityManager,
  ) {}

  async addCreditsToAllUsers(
    creditsToAdd: number,
  ): Promise<{ affected: number; transactionsCreated: number }> {
    let affectedCount = 0;
    let transactionsCount = 0;

    await this.entityManager.transaction(async (transactionalEntityManager) => {
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

  async backfillTokenSecurityInfo(): Promise<{
    processed: number;
    updated: number;
    failed: number;
    noData: number;
  }> {
    this.logger.log('Starting backfill for token security info...');
    const tokensToProcess = await this.tokenRepository.find({
      select: ['mintAddress'],
    });

    let updated = 0;
    let failed = 0;
    let noData = 0;
    const totalToProcess = tokensToProcess.length;

    this.logger.log(
      `Found ${totalToProcess} tokens potentially missing security info.`,
    );

    for (let i = 0; i < totalToProcess; i++) {
      const token = tokensToProcess[i];
      this.logger.debug(
        `Processing token ${i + 1}/${totalToProcess}: ${token.mintAddress}`,
      );
      try {
        const securityInfo = await this.tokensService.fetchTokenSecurityInfo(
          token.mintAddress,
        );

        if (securityInfo) {
          const updatePayload: Partial<TokenEntity> = {
            creatorAddress: securityInfo.creatorAddress ?? null,
            creationTx: securityInfo.creationTx ?? null,
            creationTime: securityInfo.creationTime
              ? new Date(securityInfo.creationTime * 1000)
              : null,
          };

          if (
            updatePayload.creatorAddress ||
            updatePayload.creationTx ||
            updatePayload.creationTime
          ) {
            await this.tokenRepository.update(
              { mintAddress: token.mintAddress },
              updatePayload,
            );
            updated++;
            this.logger.log(
              `Updated token ${token.mintAddress} with security info: ${JSON.stringify(updatePayload)}`,
            );
          } else {
            noData++;
            this.logger.log(
              `Security info fetched for ${token.mintAddress}, but contained no data. Skipping update.`,
            );
          }
        } else {
          noData++;
          this.logger.log(
            `No security info could be retrieved for ${token.mintAddress}, skipping update.`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      } catch (error) {
        failed++;
        this.logger.error(
          `Failed during security info backfill for ${token.mintAddress}: ${error.message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    this.logger.log(
      `Security info backfill complete. Processed: ${totalToProcess}, Updated: ${updated}, No Data/Failed Fetch: ${noData + failed}`,
    );
    return { processed: totalToProcess, updated, failed, noData };
  }
}
