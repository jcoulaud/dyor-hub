import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationMetadataJsonb1743983398612
  implements MigrationInterface
{
  name = 'AddNotificationMetadataJsonb1743983398612';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "leaderboards" DROP CONSTRAINT "FK_leaderboards_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_notification_preferences_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_activities" DROP CONSTRAINT "FK_user_activities_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" DROP CONSTRAINT "FK_user_badges_badge"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" DROP CONSTRAINT "FK_user_badges_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_reputations" DROP CONSTRAINT "FK_user_reputations_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_streaks" DROP CONSTRAINT "FK_user_streaks_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leaderboards" DROP CONSTRAINT "UQ_leaderboards"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP CONSTRAINT "UQ_notification_preferences"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" DROP CONSTRAINT "UQ_user_badges_user_badge"`,
    );
    await queryRunner.query(`ALTER TABLE "badges" DROP COLUMN "image_url"`);
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "relatedMetadata" jsonb`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notification_preferences_notification_type_enum" AS ENUM('streak_at_risk', 'streak_achieved', 'streak_broken', 'badge_earned', 'leaderboard_change', 'reputation_milestone', 'comment_reply', 'upvote_received', 'system')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ALTER COLUMN "notification_type" TYPE "public"."notification_preferences_notification_type_enum" USING "notification_type"::"text"::"public"."notification_preferences_notification_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notification_preferences_notification_type_enum" USING "type"::"text"::"public"."notification_preferences_notification_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_0f57a0c3adbbfd460935b7b046" ON "notifications" ("user_id", "is_read", "created_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "leaderboards" ADD CONSTRAINT "UQ_0e2f37e91a8ecbcf983bc6b6ed1" UNIQUE ("user_id", "category", "timeframe")`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD CONSTRAINT "UQ_f22207503ea3210d2c18182cd4f" UNIQUE ("user_id", "notification_type")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" ADD CONSTRAINT "UQ_201b6e34825dc5bd06181320bde" UNIQUE ("user_id", "badge_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "leaderboards" ADD CONSTRAINT "FK_f9ead872f240d3cf23fb2d3fc5f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD CONSTRAINT "FK_64c90edc7310c6be7c10c96f675" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_activities" ADD CONSTRAINT "FK_a283f37e08edf5e37d38b375eec" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" ADD CONSTRAINT "FK_f1221d9b1aaa64b1f3c98ed46d3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" ADD CONSTRAINT "FK_715b81e610ab276ff6603cfc8e8" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_reputations" ADD CONSTRAINT "FK_f4307e40c8aad50224b51b95ed9" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_streaks" ADD CONSTRAINT "FK_91fc9bfd912d8ce3ae4be2ea193" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_streaks" DROP CONSTRAINT "FK_91fc9bfd912d8ce3ae4be2ea193"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_reputations" DROP CONSTRAINT "FK_f4307e40c8aad50224b51b95ed9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" DROP CONSTRAINT "FK_715b81e610ab276ff6603cfc8e8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" DROP CONSTRAINT "FK_f1221d9b1aaa64b1f3c98ed46d3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_activities" DROP CONSTRAINT "FK_a283f37e08edf5e37d38b375eec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_64c90edc7310c6be7c10c96f675"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leaderboards" DROP CONSTRAINT "FK_f9ead872f240d3cf23fb2d3fc5f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" DROP CONSTRAINT "UQ_201b6e34825dc5bd06181320bde"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP CONSTRAINT "UQ_f22207503ea3210d2c18182cd4f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leaderboards" DROP CONSTRAINT "UQ_0e2f37e91a8ecbcf983bc6b6ed1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0f57a0c3adbbfd460935b7b046"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('streak_at_risk', 'streak_achieved', 'streak_broken', 'badge_earned', 'leaderboard_change', 'reputation_milestone', 'comment_reply', 'upvote_received', 'system')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ALTER COLUMN "notification_type" TYPE "public"."notifications_type_enum_old" USING "notification_type"::"text"::"public"."notifications_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."notification_preferences_notification_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "relatedMetadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "badges" ADD "image_url" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" ADD CONSTRAINT "UQ_user_badges_user_badge" UNIQUE ("user_id", "badge_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD CONSTRAINT "UQ_notification_preferences" UNIQUE ("user_id", "notification_type")`,
    );
    await queryRunner.query(
      `ALTER TABLE "leaderboards" ADD CONSTRAINT "UQ_leaderboards" UNIQUE ("user_id", "category", "timeframe")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_streaks" ADD CONSTRAINT "FK_user_streaks_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_reputations" ADD CONSTRAINT "FK_user_reputations_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" ADD CONSTRAINT "FK_user_badges_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" ADD CONSTRAINT "FK_user_badges_badge" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_activities" ADD CONSTRAINT "FK_user_activities_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD CONSTRAINT "FK_notification_preferences_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "leaderboards" ADD CONSTRAINT "FK_leaderboards_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
