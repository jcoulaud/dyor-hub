import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTokenSentiments1717600000000 implements MigrationInterface {
  name = 'AddTokenSentiments1717600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create SentimentType enum
    await queryRunner.query(`
      CREATE TYPE "public"."token_sentiments_sentiment_type_enum" AS ENUM(
        'bullish', 'bearish', 'redFlag'
      )
    `);

    // Create token_sentiments table
    await queryRunner.query(`
      CREATE TABLE "token_sentiments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token_mint_address" character varying NOT NULL,
        "sentiment_type" "public"."token_sentiments_sentiment_type_enum" NOT NULL,
        "value" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_token_sentiments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_token_sentiments_user_token" UNIQUE ("user_id", "token_mint_address")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "token_sentiments" ADD CONSTRAINT "FK_token_sentiments_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "token_sentiments" ADD CONSTRAINT "FK_token_sentiments_token"
      FOREIGN KEY ("token_mint_address") REFERENCES "tokens"("mint_address") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    await queryRunner.query(`
      ALTER TABLE "token_sentiments" DROP CONSTRAINT "FK_token_sentiments_token"
    `);
    await queryRunner.query(`
      ALTER TABLE "token_sentiments" DROP CONSTRAINT "FK_token_sentiments_user"
    `);

    // Drop table
    await queryRunner.query(`DROP TABLE "token_sentiments"`);

    // Drop enum
    await queryRunner.query(
      `DROP TYPE "public"."token_sentiments_sentiment_type_enum"`,
    );
  }
}
