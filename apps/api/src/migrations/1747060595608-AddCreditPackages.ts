import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreditPackages1747060595608 implements MigrationInterface {
  name = 'AddCreditPackages1747060595608';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, deactivate all existing packages
    await queryRunner.query(
      `UPDATE "credit_package" SET "isActive" = false WHERE "isActive" = true`,
    );

    // Add new credit packages
    await queryRunner.query(
      `INSERT INTO "credit_package" ("name", "credits", "solPrice", "isActive") VALUES
       ('Shrimp Package', 10, 0.05, true),
       ('Fish Package', 25, 0.1, true),
       ('Dolphin Package', 75, 0.25, true),
       ('Whale Package', 200, 0.5, true)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove credit packages
    await queryRunner.query(
      `DELETE FROM "credit_package" WHERE "name" IN ('Shrimp Package', 'Fish Package', 'Dolphin Package', 'Whale Package')`,
    );

    // Reactivate previous packages (if any)
    await queryRunner.query(
      `UPDATE "credit_package" SET "isActive" = true WHERE "isActive" = false`,
    );
  }
}
