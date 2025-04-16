import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferenceSupplyInTokenCalls1744382955120
  implements MigrationInterface
{
  name = 'AddReferenceSupplyInTokenCalls1744382955120';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "token_calls" ADD "reference_supply" numeric(30,8)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "token_calls" DROP COLUMN "reference_supply"`,
    );
  }
}
