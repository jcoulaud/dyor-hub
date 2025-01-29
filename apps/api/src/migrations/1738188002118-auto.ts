import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1738188002118 implements MigrationInterface {
    name = 'Auto1738188002118'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tokens" ("mint_address" character varying NOT NULL, "name" character varying NOT NULL, "symbol" character varying NOT NULL, "description" text, "image_url" character varying, "website_url" character varying, "telegram_url" character varying, "twitter_handle" character varying, "views_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ef028b7cf0ceaceec2a7a1cb8b8" PRIMARY KEY ("mint_address"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "twitter_id" character varying NOT NULL, "username" character varying NOT NULL, "display_name" character varying NOT NULL, "avatar_url" character varying NOT NULL, "twitter_access_token" character varying, "twitter_refresh_token" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "content" text NOT NULL, "token_mint_address" character varying NOT NULL, "user_id" uuid NOT NULL, "parent_id" uuid, "upvotes_count" integer NOT NULL DEFAULT '0', "downvotes_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8bf68bc960f2b69e818bdb90dcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."comment_votes_vote_type_enum" AS ENUM('upvote', 'downvote')`);
        await queryRunner.query(`CREATE TABLE "comment_votes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "comment_id" uuid NOT NULL, "user_id" uuid NOT NULL, "vote_type" "public"."comment_votes_vote_type_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_134f68c8e62163194eb6cd95632" UNIQUE ("user_id", "comment_id"), CONSTRAINT "PK_2f0e8a57401e7d3fc0e966e771e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_b76aa883411b1429578e8f98118" FOREIGN KEY ("token_mint_address") REFERENCES "tokens"("mint_address") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_d6f93329801a93536da4241e386" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comment_votes" ADD CONSTRAINT "FK_1b41b98c56a06654513bffc1274" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comment_votes" ADD CONSTRAINT "FK_bc20ac5a0c8715d3e99e5dc6793" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comment_votes" DROP CONSTRAINT "FK_bc20ac5a0c8715d3e99e5dc6793"`);
        await queryRunner.query(`ALTER TABLE "comment_votes" DROP CONSTRAINT "FK_1b41b98c56a06654513bffc1274"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_d6f93329801a93536da4241e386"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_b76aa883411b1429578e8f98118"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d"`);
        await queryRunner.query(`DROP TABLE "comment_votes"`);
        await queryRunner.query(`DROP TYPE "public"."comment_votes_vote_type_enum"`);
        await queryRunner.query(`DROP TABLE "comments"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "tokens"`);
    }

}
