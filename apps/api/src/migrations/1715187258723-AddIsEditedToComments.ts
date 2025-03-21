import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsEditedToComments1715187258723 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "comments" ADD COLUMN "is_edited" BOOLEAN NOT NULL DEFAULT FALSE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN "is_edited"`);
  }
}
