import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddViewsCount1738002396040 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First check if the column exists
    const table = await queryRunner.getTable('tokens');
    const viewsCountColumn = table?.findColumnByName('viewsCount');

    if (!viewsCountColumn) {
      await queryRunner.query(
        `ALTER TABLE "tokens" ADD "viewsCount" integer NOT NULL DEFAULT 0`,
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Don't drop the column in down migration to preserve data
    // If needed, create a separate migration to remove it
  }
}
