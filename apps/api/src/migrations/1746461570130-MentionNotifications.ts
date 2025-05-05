import { MigrationInterface, QueryRunner } from 'typeorm';

export class MentionNotifications1746461570130 implements MigrationInterface {
  name = 'MentionNotifications1746461570130';

  // Define the primary enum name used by both tables (WITHOUT schema prefix for ALTER/CREATE TYPE)
  private enumName = '"notification_preferences_notification_type_enum"';
  private oldEnumName = '"notification_preferences_notification_type_enum_old"'; // Temporary name during migration

  // Define the NEW list of enum values including 'comment_mention'
  private newEnumValues = `(
    'streak_at_risk',
    'streak_achieved',
    'streak_broken',
    'badge_earned',
    'leaderboard_change',
    'reputation_milestone',
    'comment_reply',
    'upvote_received',
    'system',
    'token_call_verified',
    'followed_user_prediction',
    'followed_user_comment',
    'followed_user_vote',
    'referral_success',
    'tip_received',
    'comment_mention'
  )`;

  // Define the OLD list of enum values (without 'comment_mention') for the 'down' method
  private oldEnumValues = `(
    'streak_at_risk',
    'streak_achieved',
    'streak_broken',
    'badge_earned',
    'leaderboard_change',
    'reputation_milestone',
    'comment_reply',
    'upvote_received',
    'system',
    'token_call_verified',
    'followed_user_prediction',
    'followed_user_comment',
    'followed_user_vote',
    'referral_success',
    'tip_received'
  )`;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop constraints temporarily
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP CONSTRAINT IF EXISTS "UQ_f22207503ea3210d2c18182cd4f"`,
    );

    // 2. Rename the existing enum type
    await queryRunner.query(
      `ALTER TYPE ${this.enumName} RENAME TO ${this.oldEnumName}`,
    );

    // 3. Create the new enum type with all values (including the new one)
    await queryRunner.query(
      `CREATE TYPE ${this.enumName} AS ENUM ${this.newEnumValues}`,
    );

    // 4. Update notification_preferences table to use the new enum type
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ALTER COLUMN "notification_type" TYPE ${this.enumName} USING "notification_type"::text::${this.enumName}`,
    );

    // 5. Update notifications table to use the SAME new enum type
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE ${this.enumName} USING "type"::text::${this.enumName}`,
    );

    // 6. Drop the old enum type
    await queryRunner.query(`DROP TYPE ${this.oldEnumName}`);

    // 7. Re-add constraints
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD CONSTRAINT "UQ_f22207503ea3210d2c18182cd4f" UNIQUE ("user_id", "notification_type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert the changes made in the 'up' method

    // 1. Drop constraints temporarily
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP CONSTRAINT IF EXISTS "UQ_f22207503ea3210d2c18182cd4f"`,
    );

    // 2. Rename the current enum type (the one with 'comment_mention') to the temporary old name
    await queryRunner.query(
      `ALTER TYPE ${this.enumName} RENAME TO ${this.oldEnumName}`,
    );

    // 3. Recreate the original enum type (without 'comment_mention')
    await queryRunner.query(
      `CREATE TYPE ${this.enumName} AS ENUM ${this.oldEnumValues}`,
    );

    // 4. Alter notification_preferences table back to use the original enum type
    // Warning: This might fail if 'comment_mention' values exist. Consider data migration if needed.
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ALTER COLUMN "notification_type" TYPE ${this.enumName} USING "notification_type"::text::${this.enumName}`,
    );

    // 5. Alter notifications table back to use the original enum type
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE ${this.enumName} USING "type"::text::${this.enumName}`,
    );

    // 6. Drop the renamed enum type (the one that contained 'comment_mention')
    await queryRunner.query(`DROP TYPE ${this.oldEnumName}`);

    // 7. Re-add constraints
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD CONSTRAINT "UQ_f22207503ea3210d2c18182cd4f" UNIQUE ("user_id", "notification_type")`,
    );
  }
}
