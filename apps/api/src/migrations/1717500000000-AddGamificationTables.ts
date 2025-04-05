import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGamificationTables1717500000000 implements MigrationInterface {
  name = 'AddGamificationTables1717500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // User Activities table
    await queryRunner.query(`
      CREATE TYPE "public"."user_activities_activity_type_enum" AS ENUM(
        'comment', 'post', 'upvote', 'downvote', 'login'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "user_activities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "activity_type" "public"."user_activities_activity_type_enum" NOT NULL,
        "entity_id" character varying,
        "entity_type" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_activities" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "user_activities" ADD CONSTRAINT "FK_user_activities_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // User Streaks table
    await queryRunner.query(`
      CREATE TABLE "user_streaks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "current_streak" integer NOT NULL DEFAULT 0,
        "longest_streak" integer NOT NULL DEFAULT 0,
        "last_activity_date" date,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_streaks" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_streaks_user_id" UNIQUE ("user_id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "user_streaks" ADD CONSTRAINT "FK_user_streaks_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Badges table
    await queryRunner.query(`
      CREATE TYPE "public"."badges_category_enum" AS ENUM(
        'streak', 'content', 'engagement', 'voting', 'reception', 'quality'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "badges" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text NOT NULL,
        "category" "public"."badges_category_enum" NOT NULL,
        "image_url" character varying,
        "requirement" character varying NOT NULL,
        "threshold_value" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_badges" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_badges_name" UNIQUE ("name")
      )
    `);

    // User Badges table
    await queryRunner.query(`
      CREATE TABLE "user_badges" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "badge_id" uuid NOT NULL,
        "earned_at" TIMESTAMP NOT NULL,
        "is_displayed" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_badges" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_badges_user_badge" UNIQUE ("user_id", "badge_id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "user_badges" ADD CONSTRAINT "FK_user_badges_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "user_badges" ADD CONSTRAINT "FK_user_badges_badge"
      FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // User Reputation table
    await queryRunner.query(`
      CREATE TABLE "user_reputations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "total_points" integer NOT NULL DEFAULT 0,
        "weekly_points" integer NOT NULL DEFAULT 0,
        "weekly_points_last_reset" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_reputations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_reputations_user_id" UNIQUE ("user_id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "user_reputations" ADD CONSTRAINT "FK_user_reputations_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Notifications table
    await queryRunner.query(`
      CREATE TYPE "public"."notifications_type_enum" AS ENUM(
        'streak_at_risk', 'streak_achieved', 'streak_broken', 'badge_earned', 
        'leaderboard_change', 'reputation_milestone', 'comment_reply', 
        'upvote_received', 'system'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" "public"."notifications_type_enum" NOT NULL,
        "message" text NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "related_entity_id" character varying,
        "related_entity_type" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Notification Preferences table
    await queryRunner.query(`
      CREATE TABLE "notification_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "notification_type" "public"."notifications_type_enum" NOT NULL,
        "in_app_enabled" boolean NOT NULL DEFAULT true,
        "email_enabled" boolean NOT NULL DEFAULT false,
        "telegram_enabled" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notification_preferences" UNIQUE ("user_id", "notification_type")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "notification_preferences" ADD CONSTRAINT "FK_notification_preferences_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Leaderboards table
    await queryRunner.query(`
      CREATE TYPE "public"."leaderboards_category_enum" AS ENUM(
        'comments', 'posts', 'upvotes_given', 'upvotes_received', 'reputation'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."leaderboards_timeframe_enum" AS ENUM(
        'weekly', 'monthly', 'all_time'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "leaderboards" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "category" "public"."leaderboards_category_enum" NOT NULL,
        "timeframe" "public"."leaderboards_timeframe_enum" NOT NULL,
        "rank" integer NOT NULL,
        "score" integer NOT NULL,
        "previous_rank" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leaderboards" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_leaderboards" UNIQUE ("user_id", "category", "timeframe")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "leaderboards" ADD CONSTRAINT "FK_leaderboards_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop leaderboards
    await queryRunner.query(
      `ALTER TABLE "leaderboards" DROP CONSTRAINT "FK_leaderboards_user"`,
    );
    await queryRunner.query(`DROP TABLE "leaderboards"`);
    await queryRunner.query(`DROP TYPE "public"."leaderboards_timeframe_enum"`);
    await queryRunner.query(`DROP TYPE "public"."leaderboards_category_enum"`);

    // Drop notification preferences
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_notification_preferences_user"`,
    );
    await queryRunner.query(`DROP TABLE "notification_preferences"`);

    // Drop notifications
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);

    // Drop user reputations
    await queryRunner.query(
      `ALTER TABLE "user_reputations" DROP CONSTRAINT "FK_user_reputations_user"`,
    );
    await queryRunner.query(`DROP TABLE "user_reputations"`);

    // Drop user badges
    await queryRunner.query(
      `ALTER TABLE "user_badges" DROP CONSTRAINT "FK_user_badges_badge"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" DROP CONSTRAINT "FK_user_badges_user"`,
    );
    await queryRunner.query(`DROP TABLE "user_badges"`);

    // Drop badges
    await queryRunner.query(`DROP TABLE "badges"`);
    await queryRunner.query(`DROP TYPE "public"."badges_category_enum"`);

    // Drop user streaks
    await queryRunner.query(
      `ALTER TABLE "user_streaks" DROP CONSTRAINT "FK_user_streaks_user"`,
    );
    await queryRunner.query(`DROP TABLE "user_streaks"`);

    // Drop user activities
    await queryRunner.query(
      `ALTER TABLE "user_activities" DROP CONSTRAINT "FK_user_activities_user"`,
    );
    await queryRunner.query(`DROP TABLE "user_activities"`);
    await queryRunner.query(
      `DROP TYPE "public"."user_activities_activity_type_enum"`,
    );
  }
}
