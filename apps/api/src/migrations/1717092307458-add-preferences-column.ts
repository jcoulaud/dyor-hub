import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPreferencesColumn1717092307458 implements MigrationInterface {
  name = 'AddPreferencesColumn1717092307458';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferences" JSONB DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "preferences"`,
    );
  }
}
