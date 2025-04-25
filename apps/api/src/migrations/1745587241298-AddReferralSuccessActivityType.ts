import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferralSuccessActivityType1745587241298
  implements MigrationInterface
{
  name = 'AddReferralSuccessActivityType1745587241298';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new value 'referral_success' to the existing enum
    await queryRunner.query(
      `ALTER TYPE "public"."user_activities_activity_type_enum" ADD VALUE IF NOT EXISTS 'referral_success'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      "Reverting addition of 'referral_success' to enum 'user_activities_activity_type_enum' is not automatically supported.",
    );
  }
}
