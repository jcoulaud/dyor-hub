import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveWalletAddressFromUsers1716500000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "wallet_address";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "wallet_address" varchar NULL;
    `);
  }
}
