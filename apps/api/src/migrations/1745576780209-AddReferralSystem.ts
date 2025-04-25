import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferralSystem1745576780209 implements MigrationInterface {
  name = 'AddReferralSystem1745576780209';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create referrals table
    await queryRunner.query(
      `CREATE TABLE "referrals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "referrerId" uuid NOT NULL, "referredUserId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_referrals_referredUserId" UNIQUE ("referredUserId"), CONSTRAINT "PK_referrals_id" PRIMARY KEY ("id"))`,
    );
    // Add index on referrerId
    await queryRunner.query(
      `CREATE INDEX "IDX_referrals_referrerId" ON "referrals" ("referrerId") `,
    );
    // Add referral_code column to users with length 5
    await queryRunner.query(
      `ALTER TABLE "users" ADD "referral_code" character varying(5)`,
    );
    // Add unique index on referral_code (nullable)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_referral_code_unique" ON "users" ("referral_code") WHERE "referral_code" IS NOT NULL`,
    );
    // Add FK from referrals.referrerId to users.id
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD CONSTRAINT "FK_referrals_referrerId_users_id" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    // Add FK from referrals.referredUserId to users.id
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD CONSTRAINT "FK_referrals_referredUserId_users_id" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FKs first
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT "FK_referrals_referredUserId_users_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT "FK_referrals_referrerId_users_id"`,
    );
    // Drop unique index on users.referral_code
    await queryRunner.query(
      `DROP INDEX "public"."IDX_users_referral_code_unique"`,
    );
    // Drop referral_code column from users
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referral_code"`);
    // Drop index on referrals.referrerId
    await queryRunner.query(`DROP INDEX "public"."IDX_referrals_referrerId"`);
    // Drop referrals table
    await queryRunner.query(`DROP TABLE "referrals"`);
  }
}
