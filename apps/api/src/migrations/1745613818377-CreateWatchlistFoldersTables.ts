import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWatchlistFoldersTables1745613818377
  implements MigrationInterface
{
  name = 'CreateWatchlistFoldersTables1745613818377';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create watchlist folder tables
    await queryRunner.query(
      `CREATE TABLE "token_watchlist_folder_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "folder_id" uuid NOT NULL, "token_mint_address" character varying NOT NULL, "position" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5dc14a1a4de61a29366e017152c" UNIQUE ("folder_id", "token_mint_address"), CONSTRAINT "PK_6e2101748813f12b051f0e8b0dd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_watchlist_folder_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "folder_id" uuid NOT NULL, "watched_user_id" uuid NOT NULL, "position" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_89b91af871254183114f8774b5c" UNIQUE ("folder_id", "watched_user_id"), CONSTRAINT "PK_ace9d169c1f2afe051387d29497" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "watchlist_folders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "position" integer NOT NULL DEFAULT '0', "folder_type" character varying NOT NULL DEFAULT 'token', "user_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e5ec132d1d9c023aeb8b7a36d74" PRIMARY KEY ("id"))`,
    );

    // Add foreign key constraints for watchlist folder tables
    await queryRunner.query(
      `ALTER TABLE "token_watchlist_folder_items" ADD CONSTRAINT "FK_37694b621846df8b33939d45c77" FOREIGN KEY ("folder_id") REFERENCES "watchlist_folders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_watchlist_folder_items" ADD CONSTRAINT "FK_bb3b8678e0e2bf442bb1d863c4c" FOREIGN KEY ("token_mint_address") REFERENCES "tokens"("mint_address") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_watchlist_folder_items" ADD CONSTRAINT "FK_83cc3b9c99f6c9e8f92676f0d2b" FOREIGN KEY ("folder_id") REFERENCES "watchlist_folders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_watchlist_folder_items" ADD CONSTRAINT "FK_51efc8837a6146831f3c7aa6ce1" FOREIGN KEY ("watched_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "watchlist_folders" ADD CONSTRAINT "FK_06f9e4fb3f6a3900cc06d906949" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints for watchlist folder tables
    await queryRunner.query(
      `ALTER TABLE "watchlist_folders" DROP CONSTRAINT "FK_06f9e4fb3f6a3900cc06d906949"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_watchlist_folder_items" DROP CONSTRAINT "FK_51efc8837a6146831f3c7aa6ce1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_watchlist_folder_items" DROP CONSTRAINT "FK_83cc3b9c99f6c9e8f92676f0d2b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_watchlist_folder_items" DROP CONSTRAINT "FK_bb3b8678e0e2bf442bb1d863c4c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_watchlist_folder_items" DROP CONSTRAINT "FK_37694b621846df8b33939d45c77"`,
    );

    // Drop watchlist folder tables
    await queryRunner.query(`DROP TABLE "watchlist_folders"`);
    await queryRunner.query(`DROP TABLE "user_watchlist_folder_items"`);
    await queryRunner.query(`DROP TABLE "token_watchlist_folder_items"`);
  }
}
