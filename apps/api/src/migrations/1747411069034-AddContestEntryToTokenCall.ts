import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContestEntryToTokenCall1747411069034
  implements MigrationInterface
{
  name = 'AddContestEntryToTokenCall1747411069034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the isContestEntry column
    await queryRunner.query(
      `ALTER TABLE "token_calls" ADD COLUMN "isContestEntry" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the isContestEntry column
    await queryRunner.query(
      `ALTER TABLE "token_calls" DROP COLUMN "isContestEntry"`,
    );
  }
}
