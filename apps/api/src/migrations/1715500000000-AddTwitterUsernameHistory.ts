import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTwitterUsernameHistory1715500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the uuid-ossp extension exists
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Check if table already exists before creating it
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'twitter_username_history'
      );
    `);

    if (!tableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "twitter_username_history" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "token_mint_address" varchar NOT NULL,
          "twitter_username" varchar NOT NULL,
          "history" jsonb,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          
          CONSTRAINT "PK_twitter_username_history" PRIMARY KEY ("id")
        )
      `);

      // Check if foreign key exists before creating it
      const fkExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_twitter_username_history_token'
          AND table_schema = 'public'
        );
      `);

      if (!fkExists[0].exists) {
        // Add foreign key constraint
        await queryRunner.query(`
          ALTER TABLE "twitter_username_history" 
          ADD CONSTRAINT "FK_twitter_username_history_token" 
          FOREIGN KEY ("token_mint_address") 
          REFERENCES "tokens"("mint_address") 
          ON DELETE CASCADE
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const fkExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints
        WHERE constraint_name = 'FK_twitter_username_history_token'
        AND table_schema = 'public'
      );
    `);

    if (fkExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE "twitter_username_history" 
        DROP CONSTRAINT "FK_twitter_username_history_token"
      `);
    }

    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'twitter_username_history'
      );
    `);

    if (tableExists[0].exists) {
      await queryRunner.query(`DROP TABLE "twitter_username_history"`);
    }
  }
}
