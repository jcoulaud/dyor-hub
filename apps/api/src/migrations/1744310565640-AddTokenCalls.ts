import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTokenCalls1744310565640 implements MigrationInterface {
  name = 'AddTokenCalls1744310565640';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."token_calls_status_enum" AS ENUM('PENDING', 'VERIFIED_SUCCESS', 'VERIFIED_FAIL', 'ERROR')`,
    );
    await queryRunner.query(
      `CREATE TABLE "token_calls" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_id" character varying NOT NULL, "call_timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "reference_price" numeric(18,8) NOT NULL, "target_price" numeric(18,8) NOT NULL, "timeframe_duration" character varying NOT NULL, "target_date" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."token_calls_status_enum" NOT NULL DEFAULT 'PENDING', "verification_timestamp" TIMESTAMP WITH TIME ZONE, "peak_price_during_period" numeric(18,8), "final_price_at_target_date" numeric(18,8), "target_hit_timestamp" TIMESTAMP WITH TIME ZONE, "time_to_hit_ratio" double precision, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_02471fce35fd3a6574ab3adae3" CHECK ("status" != 'VERIFIED_SUCCESS' OR "target_hit_timestamp" IS NOT NULL), CONSTRAINT "CHK_1d8b8b3873f8b138514fcb3014" CHECK ("status" != 'VERIFIED_SUCCESS' OR "time_to_hit_ratio" IS NOT NULL), CONSTRAINT "PK_3810f466b019fa7024fde35601b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_af00e10a12725d49f9e1d2f291" ON "token_calls" ("status", "target_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_168b4e5488099d42ff7b6783ae" ON "token_calls" ("token_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_733dca8e99e45ce40a38e8c781" ON "token_calls" ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "token_calls" ADD CONSTRAINT "FK_733dca8e99e45ce40a38e8c7811" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_calls" ADD CONSTRAINT "FK_168b4e5488099d42ff7b6783aef" FOREIGN KEY ("token_id") REFERENCES "tokens"("mint_address") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "token_calls" DROP CONSTRAINT "FK_168b4e5488099d42ff7b6783aef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_calls" DROP CONSTRAINT "FK_733dca8e99e45ce40a38e8c7811"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_733dca8e99e45ce40a38e8c781"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_168b4e5488099d42ff7b6783ae"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_af00e10a12725d49f9e1d2f291"`,
    );
    await queryRunner.query(`DROP TABLE "token_calls"`);
    await queryRunner.query(`DROP TYPE "public"."token_calls_status_enum"`);
  }
}
