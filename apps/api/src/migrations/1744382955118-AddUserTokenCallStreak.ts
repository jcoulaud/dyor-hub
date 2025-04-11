import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTokenCallStreak1744382955118 implements MigrationInterface {
  name = 'AddUserTokenCallStreak1744382955118';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_token_call_streaks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "current_success_streak" integer NOT NULL DEFAULT '0', "longest_success_streak" integer NOT NULL DEFAULT '0', "last_verified_call_timestamp" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_b4b606a3354cc6422182814a8e9" UNIQUE ("user_id"), CONSTRAINT "REL_b4b606a3354cc6422182814a8e" UNIQUE ("user_id"), CONSTRAINT "PK_3b313c0ffa4999d311870ba6f53" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_token_call_streaks" ADD CONSTRAINT "FK_b4b606a3354cc6422182814a8e9" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_token_call_streaks" DROP CONSTRAINT "FK_b4b606a3354cc6422182814a8e9"`,
    );
    await queryRunner.query(`DROP TABLE "user_token_call_streaks"`);
  }
}
