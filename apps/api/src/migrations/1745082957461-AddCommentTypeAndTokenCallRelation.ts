import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommentTypeAndTokenCallRelation1745082957461
  implements MigrationInterface
{
  name = 'AddCommentTypeAndTokenCallRelation1745082957461';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Restore DO block to conditionally create the enum type
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comments_type_enum') THEN
          CREATE TYPE "public"."comments_type_enum" AS ENUM('comment', 'token_call_explanation');
        END IF;
      END$$;
    `);

    // Add the type column to the comments table
    // Check if column exists first to avoid error if migration partially ran
    const typeColumnExists = await queryRunner.hasColumn('comments', 'type');
    if (!typeColumnExists) {
      await queryRunner.query(
        `ALTER TABLE "comments" ADD "type" "public"."comments_type_enum" NOT NULL DEFAULT 'comment'`,
      );
    }

    // Backfill existing comments to have the default 'comment' type
    await queryRunner.query(
      `UPDATE "comments" SET type = 'comment' WHERE type IS NULL`,
    );

    // Add the token_call_id column
    const tokenCallIdColumnExists = await queryRunner.hasColumn(
      'comments',
      'token_call_id',
    );
    if (!tokenCallIdColumnExists) {
      await queryRunner.query(
        `ALTER TABLE "comments" ADD "token_call_id" uuid`,
      );
    }

    // Add the foreign key constraint
    // Check if constraint exists before adding
    const fkExistsResult = await queryRunner.query(
      `SELECT constraint_name FROM information_schema.table_constraints 
         WHERE table_name = 'comments' AND constraint_name = 'FK_34e0bd0941c6d08b549ba60fe04'`,
    );
    if (fkExistsResult.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "comments" ADD CONSTRAINT "FK_34e0bd0941c6d08b549ba60fe04" FOREIGN KEY ("token_call_id") REFERENCES "token_calls"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
      );
    }

    // Drop the timeframe_duration column
    const timeframeColumnExists = await queryRunner.hasColumn(
      'token_calls',
      'timeframe_duration',
    );
    if (timeframeColumnExists) {
      await queryRunner.query(
        `ALTER TABLE "token_calls" DROP COLUMN "timeframe_duration"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the timeframe_duration column
    const timeframeColumnExists = await queryRunner.hasColumn(
      'token_calls',
      'timeframe_duration',
    );
    if (!timeframeColumnExists) {
      await queryRunner.query(
        `ALTER TABLE "token_calls" ADD COLUMN "timeframe_duration" character varying`,
      );
    }

    // Remove the foreign key constraint
    const fkExistsResult = await queryRunner.query(
      `SELECT constraint_name FROM information_schema.table_constraints 
         WHERE table_name = 'comments' AND constraint_name = 'FK_34e0bd0941c6d08b549ba60fe04'`,
    );
    if (fkExistsResult.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "comments" DROP CONSTRAINT "FK_34e0bd0941c6d08b549ba60fe04"`,
      );
    }

    // Remove the token_call_id column
    const tokenCallIdColumnExists = await queryRunner.hasColumn(
      'comments',
      'token_call_id',
    );
    if (tokenCallIdColumnExists) {
      await queryRunner.query(
        `ALTER TABLE "comments" DROP COLUMN "token_call_id"`,
      );
    }

    // Remove the type column
    const typeColumnExists = await queryRunner.hasColumn('comments', 'type');
    if (typeColumnExists) {
      await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN "type"`);
    }

    // Restore DO block to conditionally drop the enum type
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comments_type_enum') THEN
           DROP TYPE "public"."comments_type_enum";
        END IF;
      END$$;
    `);
  }
}
