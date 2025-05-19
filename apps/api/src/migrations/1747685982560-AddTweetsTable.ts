import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTweetsTable1747685982560 implements MigrationInterface {
  name = 'AddTweetsTable1747685982560';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "tweets" (
                "id" SERIAL NOT NULL,
                "tweetId" character varying(255) NULL,
                "metadata" jsonb NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_tweets_tweetId" UNIQUE ("tweetId"),
                CONSTRAINT "PK_tweets_id" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tweets"`);
  }
}
