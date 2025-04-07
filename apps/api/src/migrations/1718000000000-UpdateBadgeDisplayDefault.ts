import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateBadgeDisplayDefault1718000000000
  implements MigrationInterface
{
  name = 'UpdateBadgeDisplayDefault1718000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update existing table with new default value
    await queryRunner.query(`
      ALTER TABLE "user_badges" 
      ALTER COLUMN "is_displayed" SET DEFAULT true
    `);

    // Update existing records where is_displayed is the old default (false)
    await queryRunner.query(`
      UPDATE "user_badges"
      SET "is_displayed" = true
      WHERE "is_displayed" = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert the default value back to false
    await queryRunner.query(`
      ALTER TABLE "user_badges" 
      ALTER COLUMN "is_displayed" SET DEFAULT false
    `);

    // We don't revert the data changes to avoid losing user preferences
  }
}
