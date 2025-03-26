import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTwitterUsernameHistory1715500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
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

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "twitter_username_history" 
      ADD CONSTRAINT "FK_twitter_username_history_token" 
      FOREIGN KEY ("token_mint_address") 
      REFERENCES "tokens"("mint_address") 
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "twitter_username_history" 
      DROP CONSTRAINT "FK_twitter_username_history_token"
    `);

    await queryRunner.query(`DROP TABLE "twitter_username_history"`);
  }
}
