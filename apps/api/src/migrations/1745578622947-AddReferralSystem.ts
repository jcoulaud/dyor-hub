import { BadgeCategory, BadgeRequirement } from '@dyor-hub/types';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferralSystem1745578622947 implements MigrationInterface {
  name = 'AddReferralSystem1745578622947';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Create Referral System Schema ---
    await queryRunner.query(
      `CREATE TABLE "referrals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "referrerId" uuid NOT NULL, "referredUserId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_referrals_referredUserId" UNIQUE ("referredUserId"), CONSTRAINT "PK_referrals_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_referrals_referrerId" ON "referrals" ("referrerId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "referral_code" character varying(5)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_referral_code_unique" ON "users" ("referral_code") WHERE "referral_code" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD CONSTRAINT "FK_referrals_referrerId_users_id" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD CONSTRAINT "FK_referrals_referredUserId_users_id" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // --- Seed Referral Badges ---
    // Badge for 5 referrals
    await queryRunner.query(
      `INSERT INTO "badges" ("name", "description", "category", "requirement", "threshold_value", "is_active") VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'Recruiter',
        'Successfully referred 5 users to the platform.',
        BadgeCategory.ENGAGEMENT,
        BadgeRequirement.REFERRALS_COUNT,
        5,
        true,
      ],
    );
    // Badge for 25 referrals
    await queryRunner.query(
      `INSERT INTO "badges" ("name", "description", "category", "requirement", "threshold_value", "is_active") VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'Community Builder',
        'Successfully referred 25 users to the platform.',
        BadgeCategory.ENGAGEMENT,
        BadgeRequirement.REFERRALS_COUNT,
        25,
        true,
      ],
    );
    // Badge for 100 referrals
    await queryRunner.query(
      `INSERT INTO "badges" ("name", "description", "category", "requirement", "threshold_value", "is_active") VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'Referral Champion',
        'Successfully referred 100 users to the platform.',
        BadgeCategory.ENGAGEMENT,
        BadgeRequirement.REFERRALS_COUNT,
        100,
        true,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // --- Delete Referral Badges ---
    await queryRunner.query(
      `DELETE FROM "badges" WHERE "requirement" = $1 AND "threshold_value" = $2`,
      [BadgeRequirement.REFERRALS_COUNT, 5],
    );
    await queryRunner.query(
      `DELETE FROM "badges" WHERE "requirement" = $1 AND "threshold_value" = $2`,
      [BadgeRequirement.REFERRALS_COUNT, 25],
    );
    await queryRunner.query(
      `DELETE FROM "badges" WHERE "requirement" = $1 AND "threshold_value" = $2`,
      [BadgeRequirement.REFERRALS_COUNT, 100],
    );

    // --- Drop Referral System Schema ---
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT "FK_referrals_referredUserId_users_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT "FK_referrals_referrerId_users_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_users_referral_code_unique"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referral_code"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_referrals_referrerId"`);
    await queryRunner.query(`DROP TABLE "referrals"`);
  }
}
