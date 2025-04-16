import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateNotificationEnum1744663333333 implements MigrationInterface {
  name = 'UpdateNotificationEnum1744663333333';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create a new enum with token_call_verified
    await queryRunner.query(
      `CREATE TYPE "public"."notification_type_enum_new" AS ENUM('streak_at_risk', 'streak_achieved', 'streak_broken', 'badge_earned', 'leaderboard_change', 'reputation_milestone', 'comment_reply', 'upvote_received', 'system', 'token_call_verified')`,
    );

    // Update notification_preferences table
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ALTER COLUMN "notification_type" TYPE "public"."notification_type_enum_new" USING "notification_type"::"text"::"public"."notification_type_enum_new"`,
    );

    // Update notifications table
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notification_type_enum_new" USING "type"::"text"::"public"."notification_type_enum_new"`,
    );

    // Drop the old enum type after updating all tables that use it
    await queryRunner.query(
      `DROP TYPE "public"."notification_preferences_notification_type_enum"`,
    );

    // Rename the new enum to the standard name
    await queryRunner.query(
      `ALTER TYPE "public"."notification_type_enum_new" RENAME TO "notification_preferences_notification_type_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Create old enum version without token_call_verified
    await queryRunner.query(
      `CREATE TYPE "public"."notification_type_enum_old" AS ENUM('streak_at_risk', 'streak_achieved', 'streak_broken', 'badge_earned', 'leaderboard_change', 'reputation_milestone', 'comment_reply', 'upvote_received', 'system')`,
    );

    // Update both tables to use the old enum type
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ALTER COLUMN "notification_type" TYPE "public"."notification_type_enum_old" USING "notification_type"::"text"::"public"."notification_type_enum_old"`,
    );

    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notification_type_enum_old" USING "type"::"text"::"public"."notification_type_enum_old"`,
    );

    // Drop current enum after both tables are updated
    await queryRunner.query(
      `DROP TYPE "public"."notification_preferences_notification_type_enum"`,
    );

    // Rename old enum back to standard name
    await queryRunner.query(
      `ALTER TYPE "public"."notification_type_enum_old" RENAME TO "notification_preferences_notification_type_enum"`,
    );
  }
}
