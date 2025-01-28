import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1738002396037 implements MigrationInterface {
    name = 'Auto1738002396037'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "twitterId" character varying NOT NULL, "username" character varying NOT NULL, "displayName" character varying NOT NULL, "avatarUrl" character varying NOT NULL, "bio" character varying, "isVerified" boolean NOT NULL DEFAULT false, "twitterAccessToken" character varying, "twitterRefreshToken" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_eda3fd04bdb78a1c678fdb6ecc9" UNIQUE ("twitterId"), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_eda3fd04bdb78a1c678fdb6ecc" ON "users" ("twitterId") `);
        await queryRunner.query(`CREATE INDEX "IDX_fe0bb3f6520ee0469504521e71" ON "users" ("username") `);
        await queryRunner.query(`ALTER TABLE "comment_votes" DROP COLUMN "ipHash"`);
        await queryRunner.query(`ALTER TABLE "comment_votes" DROP COLUMN "isUpvote"`);
        await queryRunner.query(`ALTER TABLE "comments" ADD "tokenMintAddress" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "comments" ADD "userId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "comments" ADD "user_id" uuid`);
        await queryRunner.query(`ALTER TABLE "comment_votes" ADD "userId" character varying NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."vote_type_enum" AS ENUM('upvote', 'downvote')`);
        await queryRunner.query(`ALTER TABLE "comment_votes" ADD "type" "public"."vote_type_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "comment_votes" ADD "user_id" uuid`);
        await queryRunner.query(`ALTER TABLE "comment_votes" ADD CONSTRAINT "UQ_dfdbe89dc8423c08d53bdc1ccfb" UNIQUE ("commentId", "userId")`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comment_votes" ADD CONSTRAINT "FK_bc20ac5a0c8715d3e99e5dc6793" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comment_votes" DROP CONSTRAINT "FK_bc20ac5a0c8715d3e99e5dc6793"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d"`);
        await queryRunner.query(`ALTER TABLE "comment_votes" DROP CONSTRAINT "UQ_dfdbe89dc8423c08d53bdc1ccfb"`);
        await queryRunner.query(`ALTER TABLE "comment_votes" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "comment_votes" DROP COLUMN "type"`);
        await queryRunner.query(`DROP TYPE "public"."vote_type_enum"`);
        await queryRunner.query(`ALTER TABLE "comment_votes" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN "tokenMintAddress"`);
        await queryRunner.query(`ALTER TABLE "comment_votes" ADD "isUpvote" boolean NOT NULL`);
        await queryRunner.query(`ALTER TABLE "comment_votes" ADD "ipHash" character varying NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fe0bb3f6520ee0469504521e71"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eda3fd04bdb78a1c678fdb6ecc"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
