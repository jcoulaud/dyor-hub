import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserBio1746794736970 implements MigrationInterface {
  name = 'AddUserBio1746794736970';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "bio" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bio"`);
  }
}
