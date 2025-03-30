import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsPrimaryToWallets1717000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add is_primary column with default value of false
    await queryRunner.query(`
      ALTER TABLE "wallets" 
      ADD COLUMN "is_primary" BOOLEAN NOT NULL DEFAULT false
    `);

    // Create a unique partial index to ensure only one primary wallet per user
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_user_primary_wallet" 
      ON "wallets" ("user_id") 
      WHERE "is_primary" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index first
    await queryRunner.query(`DROP INDEX "idx_user_primary_wallet"`);

    // Then drop the column
    await queryRunner.query(`
      ALTER TABLE "wallets" 
      DROP COLUMN "is_primary"
    `);
  }
}
