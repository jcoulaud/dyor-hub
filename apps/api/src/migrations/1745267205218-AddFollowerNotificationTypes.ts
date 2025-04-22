import { MigrationInterface, QueryRunner } from 'typeorm';

const NOTIFICATION_ENUM_NAME =
  '"public"."notification_preferences_notification_type_enum"';

export class AddFollowerNotificationTypes1745267205218
  implements MigrationInterface
{
  name = 'AddFollowerNotificationTypes1745267205218';

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logMessage('Adding new values to notification enum type...');
    await queryRunner.query(
      `ALTER TYPE ${NOTIFICATION_ENUM_NAME} ADD VALUE IF NOT EXISTS 'followed_user_prediction'`,
    );
    await queryRunner.query(
      `ALTER TYPE ${NOTIFICATION_ENUM_NAME} ADD VALUE IF NOT EXISTS 'followed_user_comment'`,
    );
    await queryRunner.query(
      `ALTER TYPE ${NOTIFICATION_ENUM_NAME} ADD VALUE IF NOT EXISTS 'followed_user_vote'`,
    );
    this.logMessage('Notification enum values added.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down migration does not remove added enum values to prevent data loss.
    this.logMessage(
      `Skipping removal of enum values from ${NOTIFICATION_ENUM_NAME} in down migration.`,
    );
    // If removal is needed, manual SQL is required after ensuring no data uses these values.
  }

  private logMessage(message: string): void {
    // Simple logger
    console.log(`[Migration ${this.name}] ${message}`);
  }
}
