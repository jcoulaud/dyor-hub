import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTokenWatchlistsTable1717300000000
  implements MigrationInterface
{
  name = 'CreateTokenWatchlistsTable1717300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "token_watchlists" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token_mint_address" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_token_watchlists_user_id_token_mint_address" UNIQUE ("user_id", "token_mint_address"),
        CONSTRAINT "PK_token_watchlists" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "token_watchlists" 
      ADD CONSTRAINT "FK_token_watchlists_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "token_watchlists" 
      ADD CONSTRAINT "FK_token_watchlists_token_mint_address" 
      FOREIGN KEY ("token_mint_address") REFERENCES "tokens"("mint_address") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "token_watchlists" DROP CONSTRAINT "FK_token_watchlists_token_mint_address"
    `);
    await queryRunner.query(`
      ALTER TABLE "token_watchlists" DROP CONSTRAINT "FK_token_watchlists_user_id"
    `);
    await queryRunner.query(`DROP TABLE "token_watchlists"`);
  }
}
