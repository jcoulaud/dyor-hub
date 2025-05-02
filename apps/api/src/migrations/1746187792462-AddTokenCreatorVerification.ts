import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTokenCreatorVerification1746187792462
  implements MigrationInterface
{
  name = 'AddTokenCreatorVerification1746187792462';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD "creatorAddress" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD "verifiedCreatorUserId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f479e1e907984d38c81195900e" ON "tokens" ("verifiedCreatorUserId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD CONSTRAINT "FK_f479e1e907984d38c81195900e0" FOREIGN KEY ("verifiedCreatorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tokens" DROP CONSTRAINT "FK_f479e1e907984d38c81195900e0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f479e1e907984d38c81195900e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens" DROP COLUMN "verifiedCreatorUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens" DROP COLUMN "creatorAddress"`,
    );
  }
}
