import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveIpHash1738002396038 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the column exists before trying to remove it
    const table = await queryRunner.getTable('comments');
    const ipHashColumn = table?.findColumnByName('ipHash');

    if (ipHashColumn) {
      await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN "ipHash"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if the column doesn't exist before trying to add it
    const table = await queryRunner.getTable('comments');
    const ipHashColumn = table?.findColumnByName('ipHash');

    if (!ipHashColumn) {
      await queryRunner.query(
        `ALTER TABLE "comments" ADD "ipHash" character varying NOT NULL`,
      );
    }
  }
}
