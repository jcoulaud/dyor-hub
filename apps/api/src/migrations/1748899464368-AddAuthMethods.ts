import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthMethods1748899464368 implements MigrationInterface {
  name = 'AddAuthMethods1748899464368';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create auth_providers enum
    await queryRunner.query(`
      CREATE TYPE "public"."auth_methods_provider_enum" AS ENUM('twitter', 'wallet')
    `);

    // Create auth_methods table
    await queryRunner.query(`
      CREATE TABLE "auth_methods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "provider" "public"."auth_methods_provider_enum" NOT NULL,
        "provider_id" character varying NOT NULL,
        "is_primary" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_methods" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_auth_methods_user_provider" UNIQUE ("user_id", "provider", "provider_id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_auth_methods_provider_id" ON "auth_methods" ("provider", "provider_id")
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "auth_methods" ADD CONSTRAINT "FK_auth_methods_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Make Twitter fields nullable in users table
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "twitter_id" DROP NOT NULL
    `);

    // Migrate existing users to have Twitter auth methods
    await queryRunner.query(`
      INSERT INTO "auth_methods" ("user_id", "provider", "provider_id", "is_primary", "metadata", "created_at", "updated_at")
      SELECT 
        "id" as "user_id",
        'twitter' as "provider",
        "twitter_id" as "provider_id",
        true as "is_primary",
        json_build_object(
          'username', "username",
          'displayName', "display_name",
          'avatarUrl', "avatar_url"
        ) as "metadata",
        "created_at",
        "updated_at"
      FROM "users"
      WHERE "twitter_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "auth_methods" DROP CONSTRAINT "FK_auth_methods_user"
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX "IDX_auth_methods_provider_id"
    `);

    // Drop auth_methods table
    await queryRunner.query(`
      DROP TABLE "auth_methods"
    `);

    // Drop enum
    await queryRunner.query(`
      DROP TYPE "public"."auth_methods_provider_enum"
    `);

    // Make Twitter ID required again (this might fail if there are wallet-only users)
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "twitter_id" SET NOT NULL
    `);
  }
}
