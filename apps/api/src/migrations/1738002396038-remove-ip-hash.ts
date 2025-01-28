import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveIpHash1738002396038 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN "ipHash"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "comments" ADD "ipHash" character varying NOT NULL`,
    );
  }
}
