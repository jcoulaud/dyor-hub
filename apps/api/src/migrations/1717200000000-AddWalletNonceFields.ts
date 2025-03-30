import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletNonceFields1717200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE wallets 
      ADD COLUMN verification_nonce VARCHAR,
      ADD COLUMN nonce_expires_at BIGINT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE wallets 
      DROP COLUMN verification_nonce,
      DROP COLUMN nonce_expires_at
    `);
  }
}
