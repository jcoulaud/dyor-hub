import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixVoteTypeColumn1715187258724 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First check if vote_type column exists
    const voteTypeExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'comment_votes' AND column_name = 'vote_type'
            );
        `);

    // If vote_type exists, rename it to type
    if (voteTypeExists[0].exists) {
      await queryRunner.query(`
                ALTER TABLE "comment_votes" RENAME COLUMN "vote_type" TO "type";
            `);
    }

    // Drop the vote_type enum if it exists
    await queryRunner.query(`
            DROP TYPE IF EXISTS "public"."vote_type" CASCADE;
        `);

    // Create the new vote_type enum
    await queryRunner.query(`
            CREATE TYPE "public"."vote_type" AS ENUM ('upvote', 'downvote');
        `);

    // Add the vote_type column if it doesn't exist
    await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'comment_votes' AND column_name = 'vote_type'
                ) THEN
                    ALTER TABLE "comment_votes" ADD COLUMN "vote_type" "public"."vote_type" NOT NULL;
                END IF;
            END $$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert the changes
    await queryRunner.query(`
            ALTER TABLE "comment_votes" DROP COLUMN IF EXISTS "vote_type";
        `);

    await queryRunner.query(`
            DROP TYPE IF EXISTS "public"."vote_type";
        `);
  }
}
