import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserFollowsAndActivityPrediction1745261904100
  implements MigrationInterface
{
  name = 'AddUserFollowsAndActivityPrediction1745261904100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- UserFollows Table Creation ---
    await queryRunner.query(
      `CREATE TABLE "user_follows" ("followerId" uuid NOT NULL, "followedId" uuid NOT NULL, "notify_on_prediction" boolean NOT NULL DEFAULT false, "notify_on_comment" boolean NOT NULL DEFAULT false, "notify_on_vote" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c67b13661547ebf19852abb9493" PRIMARY KEY ("followerId", "followedId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e9f5692cb31f5b45c412081546" ON "user_follows" ("followedId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6300484b604263eaae8a6aab88" ON "user_follows" ("followerId") `,
    );

    // --- UserActivity Enum Update ---
    await queryRunner.query(
      `ALTER TYPE "public"."user_activities_activity_type_enum" RENAME TO "user_activities_activity_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_activities_activity_type_enum" AS ENUM('comment', 'post', 'upvote', 'downvote', 'login', 'prediction')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_activities" ALTER COLUMN "activity_type" TYPE "public"."user_activities_activity_type_enum" USING "activity_type"::"text"::"public"."user_activities_activity_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."user_activities_activity_type_enum_old"`,
    );

    // --- UserActivity Index Creation ---
    await queryRunner.query(
      `CREATE INDEX "IDX_bd789c573f3fd7da3b22f724fd" ON "user_activities" ("user_id", "created_at") `,
    );

    // --- UserFollows Foreign Keys ---
    await queryRunner.query(
      `ALTER TABLE "user_follows" ADD CONSTRAINT "FK_6300484b604263eaae8a6aab88d" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_follows" ADD CONSTRAINT "FK_e9f5692cb31f5b45c412081546a" FOREIGN KEY ("followedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // --- UserFollows Foreign Keys Drop ---
    await queryRunner.query(
      `ALTER TABLE "user_follows" DROP CONSTRAINT "FK_e9f5692cb31f5b45c412081546a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_follows" DROP CONSTRAINT "FK_6300484b604263eaae8a6aab88d"`,
    );

    // --- UserActivity Index Drop ---
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bd789c573f3fd7da3b22f724fd"`,
    );

    // --- UserActivity Enum Revert ---
    await queryRunner.query(
      `ALTER TABLE "user_activities" ALTER COLUMN "activity_type" TYPE varchar`, // Temporarily change type if needed for enum drop/recreate
    );
    await queryRunner.query(
      `DROP TYPE "public"."user_activities_activity_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_activities_activity_type_enum" AS ENUM('comment', 'post', 'upvote', 'downvote', 'login')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_activities" ALTER COLUMN "activity_type" TYPE "public"."user_activities_activity_type_enum" USING "activity_type"::"text"::"public"."user_activities_activity_type_enum"`,
    );

    // --- UserFollows Table Drop ---
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6300484b604263eaae8a6aab88"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e9f5692cb31f5b45c412081546"`,
    );
    await queryRunner.query(`DROP TABLE "user_follows"`);
  }
}
