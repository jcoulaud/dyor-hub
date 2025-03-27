import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1715187258722 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tokens table
    await queryRunner.query(`
      CREATE TABLE "tokens" (
        "mint_address" varchar NOT NULL,
        "name" varchar NOT NULL,
        "symbol" varchar NOT NULL,
        "description" text,
        "image_url" varchar,
        "website_url" varchar,
        "telegram_url" varchar,
        "twitter_handle" varchar,
        "views_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tokens" PRIMARY KEY ("mint_address")
      )
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "twitter_id" varchar NOT NULL,
        "username" varchar NOT NULL,
        "display_name" varchar NOT NULL,
        "avatar_url" varchar NOT NULL,
        "twitter_access_token" varchar,
        "twitter_refresh_token" varchar,
        "is_admin" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Create comments table
    await queryRunner.query(`
      CREATE TABLE "comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "content" text NOT NULL,
        "token_mint_address" varchar NOT NULL,
        "user_id" uuid NOT NULL,
        "parent_id" uuid,
        "upvotes_count" integer NOT NULL DEFAULT 0,
        "downvotes_count" integer NOT NULL DEFAULT 0,
        "removed_by_id" uuid,
        "removal_reason" varchar,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_comments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_comments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_comments_token" FOREIGN KEY ("token_mint_address") REFERENCES "tokens"("mint_address") ON DELETE CASCADE,
        CONSTRAINT "FK_comments_parent" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_comments_removed_by" FOREIGN KEY ("removed_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Create comment_votes table
    await queryRunner.query(`
      CREATE TYPE "public"."vote_type" AS ENUM ('upvote', 'downvote')
    `);

    await queryRunner.query(`
      CREATE TABLE "comment_votes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "vote_type" "public"."vote_type" NOT NULL,
        "user_id" uuid NOT NULL,
        "comment_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_comment_votes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_comment_votes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_comment_votes_comment" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_comment_votes_user_comment" UNIQUE ("user_id", "comment_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "comment_votes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "comments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tokens"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."vote_type"`);
  }
}
