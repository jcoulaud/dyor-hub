import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetDefaultCommentVoteType1744821163520
  implements MigrationInterface
{
  name = 'SetDefaultCommentVoteType1744821163520';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "token_sentiments" DROP CONSTRAINT "FK_token_sentiments_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_sentiments" DROP CONSTRAINT "FK_token_sentiments_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_sentiments" DROP CONSTRAINT "UQ_token_sentiments_user_token"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."badges_category_enum" RENAME TO "badges_category_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."badges_category_enum" AS ENUM('streak', 'content', 'engagement', 'voting', 'reception', 'quality')`,
    );
    await queryRunner.query(
      `ALTER TABLE "badges" ALTER COLUMN "category" TYPE "public"."badges_category_enum" USING "category"::"text"::"public"."badges_category_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."badges_category_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."notification_preferences_notification_type_enum" RENAME TO "notification_preferences_notification_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('streak_at_risk', 'streak_achieved', 'streak_broken', 'badge_earned', 'leaderboard_change', 'reputation_milestone', 'comment_reply', 'upvote_received', 'system', 'token_call_verified')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."notification_preferences_notification_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_sentiments" ADD CONSTRAINT "UQ_056a0cb6037672e5fc94d0fb485" UNIQUE ("user_id", "token_mint_address")`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_sentiments" ADD CONSTRAINT "FK_472f738e6fe3e33f345a2390ab3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_sentiments" ADD CONSTRAINT "FK_da979b36e487b249d3fe9f239e7" FOREIGN KEY ("token_mint_address") REFERENCES "tokens"("mint_address") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`
            UPDATE "comment_votes"
            SET "vote_type" = 'upvote'
            WHERE "vote_type" IS NULL;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "token_sentiments" DROP CONSTRAINT "FK_da979b36e487b249d3fe9f239e7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_sentiments" DROP CONSTRAINT "FK_472f738e6fe3e33f345a2390ab3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_sentiments" DROP CONSTRAINT "UQ_056a0cb6037672e5fc94d0fb485"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notification_preferences_notification_type_enum_old" AS ENUM('badge_earned', 'comment_reply', 'leaderboard_change', 'reputation_milestone', 'streak_achieved', 'streak_at_risk', 'streak_broken', 'system', 'token_call_verified', 'upvote_received')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notification_preferences_notification_type_enum_old" USING "type"::"text"::"public"."notification_preferences_notification_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."notification_preferences_notification_type_enum_old" RENAME TO "notification_preferences_notification_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."badges_category_enum_old" AS ENUM('content', 'engagement', 'quality', 'ranking', 'reception', 'streak', 'voting')`,
    );
    await queryRunner.query(
      `ALTER TABLE "badges" ALTER COLUMN "category" TYPE "public"."badges_category_enum_old" USING "category"::"text"::"public"."badges_category_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."badges_category_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."badges_category_enum_old" RENAME TO "badges_category_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_sentiments" ADD CONSTRAINT "UQ_token_sentiments_user_token" UNIQUE ("user_id", "token_mint_address")`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_sentiments" ADD CONSTRAINT "FK_token_sentiments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_sentiments" ADD CONSTRAINT "FK_token_sentiments_token" FOREIGN KEY ("token_mint_address") REFERENCES "tokens"("mint_address") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `-- Down migration for ${this.name}: No specific action required.`,
    );
  }
}
