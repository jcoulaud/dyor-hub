import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriceHistoryUrlToTokenCalls1744813282209
  implements MigrationInterface
{
  name = 'AddPriceHistoryUrlToTokenCalls1744813282209';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "token_calls" ADD "price_history_url" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "token_calls" DROP COLUMN "price_history_url"`,
    );
  }
}
