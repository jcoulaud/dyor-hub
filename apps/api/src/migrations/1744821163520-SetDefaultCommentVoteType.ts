import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetDefaultCommentVoteType1744821163520
  implements MigrationInterface
{
  name = 'SetDefaultCommentVoteType1744821163520';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update existing rows where vote_type is NULL to 'upvote'
    // This is safe even if the column doesn't exist or has no NULLs
    await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'comment_votes' 
                    AND column_name = 'vote_type'
                ) THEN
                    UPDATE "comment_votes"
                    SET "vote_type" = 'upvote'
                    WHERE "vote_type" IS NULL;
                END IF;
            END $$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down migration: No action needed here as reversing this default
    // might conflict with the NOT NULL constraint if it's still present.
    await queryRunner.query(
      `-- Down migration for ${this.name}: No specific action required.`,
    );
  }
}
