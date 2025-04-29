import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTipReceivedNotificationType1745964156180
  implements MigrationInterface
{
  name = 'AddTipReceivedNotificationType1745964156180';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'tip_received' to the notification_preferences_notification_type_enum
    await queryRunner.query(
      `ALTER TYPE "public"."notification_preferences_notification_type_enum" ADD VALUE IF NOT EXISTS 'tip_received'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Enums are typically not reverted in down migrations
    // See previous migration for the complex steps required to remove an enum value.
    console.log(
      '[AddTipReceivedNotificationType1745964156180] Down migration does not remove the tip_received enum value.',
    );
  }
}
