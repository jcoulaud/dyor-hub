import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEarlyTokenBuyerTable1746615721639
  implements MigrationInterface
{
  name = 'AddEarlyTokenBuyerTable1746615721639';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the early_token_buyers table with its columns, constraints, and primary key
    await queryRunner.query(
      `CREATE TABLE "early_token_buyers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token_mint_address" character varying(100) NOT NULL, "buyerWalletAddress" character varying(100) NOT NULL, "initialPurchaseTxSignature" character varying(100), "initialPurchaseTimestamp" TIMESTAMP WITH TIME ZONE, "rank" smallint NOT NULL, "isStillHolding" boolean, "lastCheckedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_TOKEN_BUYER_ADDRESS" UNIQUE ("token_mint_address", "buyerWalletAddress"), CONSTRAINT "UQ_TOKEN_BUYER_RANK" UNIQUE ("token_mint_address", "rank"), CONSTRAINT "PK_ff7fe730476f0bc1b0d9d47901e" PRIMARY KEY ("id"))`,
    );

    // Create the index on token_mint_address for faster lookups
    await queryRunner.query(
      `CREATE INDEX "IDX_EARLY_BUYER_TOKEN_MINT" ON "early_token_buyers" ("token_mint_address") `,
    );

    // Add the foreign key constraint linking early_token_buyers to the tokens table
    await queryRunner.query(
      `ALTER TABLE "early_token_buyers" ADD CONSTRAINT "FK_53c03ec057fc5f7eb193b23a54c" FOREIGN KEY ("token_mint_address") REFERENCES "tokens"("mint_address") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the foreign key constraint first
    await queryRunner.query(
      `ALTER TABLE "early_token_buyers" DROP CONSTRAINT "FK_53c03ec057fc5f7eb193b23a54c"`,
    );

    // Drop the index
    await queryRunner.query(`DROP INDEX "public"."IDX_EARLY_BUYER_TOKEN_MINT"`);

    // Drop the table
    await queryRunner.query(`DROP TABLE "early_token_buyers"`);
  }
}
