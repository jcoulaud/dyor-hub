import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreationDateAndTxInToken1746379154539
  implements MigrationInterface
{
  name = 'AddCreationDateAndTxInToken1746379154539';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tokens" ADD "creationTx" text`);
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD "creationTime" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tokens_creationTime" ON "tokens" ("creationTime") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_tokens_creationTime"`);
    await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "creationTime"`);
    await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "creationTx"`);
  }
}
