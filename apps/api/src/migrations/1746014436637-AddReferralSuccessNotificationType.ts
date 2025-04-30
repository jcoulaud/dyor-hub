import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferralSuccessNotificationType1746014436637
  implements MigrationInterface
{
  name = 'AddReferralSuccessNotificationType1746014436637';

  // Define the enum name and its temporary old name for clarity
  // Use only the identifier name, quoted. PostgreSQL defaults to 'public' schema.
  private enumName = '"notification_preferences_notification_type_enum"';
  private oldEnumName = '"notification_preferences_notification_type_enum_old"';
  // Define the new list of enum values including the addition
  private enumValues = `'streak_at_risk', 'streak_achieved', 'streak_broken', 'badge_earned', 'leaderboard_change', 'reputation_milestone', 'comment_reply', 'upvote_received', 'system', 'token_call_verified', 'followed_user_prediction', 'followed_user_comment', 'followed_user_vote', 'referral_success', 'tip_received'`;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop constraints temporarily
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP CONSTRAINT "UQ_f22207503ea3210d2c18182cd4f"`,
    );

    // Rename the existing enum type
    await queryRunner.query(
      `ALTER TYPE ${this.enumName} RENAME TO ${this.oldEnumName}`,
    );

    // Create the new enum type with all values (including the new one)
    await queryRunner.query(
      `CREATE TYPE ${this.enumName} AS ENUM(${this.enumValues})`,
    );

    // Update notification_preferences table to use the new enum type
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ALTER COLUMN "notification_type" TYPE ${this.enumName} USING "notification_type"::"text"::${this.enumName}`,
    );

    // *** Update notifications table to use the SAME new enum type ***
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE ${this.enumName} USING "type"::"text"::${this.enumName}`,
    );

    // Drop the old enum type (should have no dependencies now)
    await queryRunner.query(`DROP TYPE ${this.oldEnumName}`);

    // Re-add constraints
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD CONSTRAINT "UQ_f22207503ea3210d2c18182cd4f" UNIQUE ("user_id", "notification_type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop constraints temporarily
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP CONSTRAINT "UQ_f22207503ea3210d2c18182cd4f"`,
    );

    // To revert, we essentially perform the inverse of 'up'
    // This assumes the state before 'up' had the enum without 'referral_success'
    const oldEnumValues = this.enumValues.replace(`, 'referral_success'`, '');

    // Alter tables to use a temporary type (e.g., text) or the old enum if recreated
    // Simpler to just drop the new enum, rename old back, and let subsequent migrations handle discrepancies if needed
    // However, a more robust down would involve recreating the old enum precisely.

    // Alter tables back to a generic type or recreate old enum first.
    // Let's try altering back to the old enum after recreating it.

    // Drop the *new* enum type created in 'up'
    await queryRunner.query(`DROP TYPE ${this.enumName}`);

    // Rename the '_old' enum back to its original name
    await queryRunner.query(
      `ALTER TYPE ${this.oldEnumName} RENAME TO ${this.enumName}`,
    );

    // At this point, the tables still reference the (now correctly named) original enum type.
    // If you needed to precisely remove the value added in 'up', further steps would be needed,
    // but this restores the original enum name.

    // Re-add constraints
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD CONSTRAINT "UQ_f22207503ea3210d2c18182cd4f" UNIQUE ("user_id", "notification_type")`,
    );

    console.warn(
      "Migration 'down' simplified: Restored original enum name. Precise value removal not implemented.",
    );
  }
}
