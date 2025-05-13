import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreditSystem1747060595607 implements MigrationInterface {
  // Renamed for clarity
  name = 'AddCreditSystem1747060595607';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create credit_package table
    await queryRunner.query(
      `CREATE TABLE "credit_package" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "credits" integer NOT NULL, "solPrice" numeric(10,6) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_credit_package_id" PRIMARY KEY ("id"))`,
    );

    // Create enum for transaction type
    await queryRunner.query(
      `CREATE TYPE "public"."credit_transaction_type_enum" AS ENUM('purchase', 'usage')`,
    );

    // Create credit_transaction table
    await queryRunner.query(
      `CREATE TABLE "credit_transaction" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "type" "public"."credit_transaction_type_enum" NOT NULL, "amount" integer NOT NULL, "solanaTransactionId" character varying, "details" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_credit_transaction_solanaTxId" UNIQUE ("solanaTransactionId"), CONSTRAINT "PK_credit_transaction_id" PRIMARY KEY ("id"))`,
    );

    // Create indexes for credit_transaction
    await queryRunner.query(
      `CREATE INDEX "IDX_credit_transaction_userId" ON "credit_transaction" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_credit_transaction_solanaTxId" ON "credit_transaction" ("solanaTransactionId")`,
    );

    // Add credits column to users table
    await queryRunner.query(
      `ALTER TABLE "users" ADD "credits" integer NOT NULL DEFAULT 0`,
    );

    // Add foreign key constraint from credit_transaction to users
    await queryRunner.query(
      `ALTER TABLE "credit_transaction" ADD CONSTRAINT "FK_credit_transaction_userId_users_id" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "credit_transaction" DROP CONSTRAINT "FK_credit_transaction_userId_users_id"`,
    );

    // Drop credits column from users table
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "credits"`);

    // Drop indexes for credit_transaction
    await queryRunner.query(
      `DROP INDEX "public"."IDX_credit_transaction_solanaTxId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_credit_transaction_userId"`,
    );

    // Drop credit_transaction table
    await queryRunner.query(`DROP TABLE "credit_transaction"`);

    // Drop enum for transaction type
    await queryRunner.query(
      `DROP TYPE "public"."credit_transaction_type_enum"`,
    );

    // Drop credit_package table
    await queryRunner.query(`DROP TABLE "credit_package"`);
  }
}
