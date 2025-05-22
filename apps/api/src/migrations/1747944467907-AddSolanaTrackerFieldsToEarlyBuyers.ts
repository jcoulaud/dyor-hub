import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSolanaTrackerFieldsToEarlyBuyers1747944467907
  implements MigrationInterface
{
  name = 'AddSolanaTrackerFieldsToEarlyBuyers1747944467907';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add only stable SolanaTracker fields to early_token_buyers table
    await queryRunner.query(
      `ALTER TABLE "early_token_buyers" 
       ADD COLUMN "firstBuyTime" bigint,
       ADD COLUMN "totalInvested" decimal(20,8),
       ADD COLUMN "averageBuyAmount" decimal(20,8),
       ADD COLUMN "buyTransactions" smallint,
       ADD COLUMN "sellTransactions" smallint`,
    );

    // Remove old fields that are no longer needed
    await queryRunner.query(
      `ALTER TABLE "early_token_buyers" 
       DROP COLUMN IF EXISTS "isStillHolding",
       DROP COLUMN IF EXISTS "lastCheckedAt"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove SolanaTracker specific fields
    await queryRunner.query(
      `ALTER TABLE "early_token_buyers" 
       DROP COLUMN IF EXISTS "firstBuyTime",
       DROP COLUMN IF EXISTS "totalInvested",
       DROP COLUMN IF EXISTS "averageBuyAmount",
       DROP COLUMN IF EXISTS "buyTransactions",
       DROP COLUMN IF EXISTS "sellTransactions"`,
    );

    // Restore old fields
    await queryRunner.query(
      `ALTER TABLE "early_token_buyers" 
       ADD COLUMN "isStillHolding" boolean,
       ADD COLUMN "lastCheckedAt" TIMESTAMP WITH TIME ZONE`,
    );
  }
}
