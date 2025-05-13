import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMcapToComments1747159064160 implements MigrationInterface {
  name = 'AddMcapToComments1747159064160';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "comments" ADD "market_cap_at_creation" double precision`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "comments" DROP COLUMN "market_cap_at_creation"`,
    );
  }
}
