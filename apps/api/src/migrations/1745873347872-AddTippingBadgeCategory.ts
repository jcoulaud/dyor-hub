import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTippingBadgeCategory1745873347872
  implements MigrationInterface
{
  name = 'AddTippingBadgeCategory1745873347872';

  // Define enum values including 'ranking'
  private oldBadgeCategories =
    "('streak', 'content', 'engagement', 'voting', 'reception', 'quality', 'ranking')";
  private newBadgeCategories =
    "('streak', 'content', 'engagement', 'voting', 'reception', 'quality', 'ranking', 'tipping')";
  private tipContentTypes = "('comment', 'profile', 'call')";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- Step 1: Handle badges_category_enum update ----
    // 1a. Create new enum with tipping value (lowercase)
    await queryRunner.query(
      `CREATE TYPE "public"."badges_category_enum_new" AS ENUM${this.newBadgeCategories}`,
    );
    // 1b. Alter badges table to use the new enum, casting old values
    await queryRunner.query(
      `ALTER TABLE "badges" ALTER COLUMN "category" TYPE "public"."badges_category_enum_new" USING "category"::"text"::"public"."badges_category_enum_new"`,
    );
    // 1c. Drop the old enum
    await queryRunner.query(`DROP TYPE "public"."badges_category_enum"`);
    // 1d. Rename the new enum to the original name
    await queryRunner.query(
      `ALTER TYPE "public"."badges_category_enum_new" RENAME TO "badges_category_enum"`,
    );

    // ---- Step 2: Create Tipping Schema ----
    // 2a. Drop the enum type first if it exists (to handle partial previous runs)
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."tips_contentType_enum"`,
    );
    // 2b. Create the enum type for tip contentType
    await queryRunner.query(
      `CREATE TYPE "public"."tips_contentType_enum" AS ENUM${this.tipContentTypes}`,
    );

    // 2c. Create the 'tips' table
    await queryRunner.query(`
      CREATE TABLE "tips" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "senderId" uuid,
        "senderWalletAddress" character varying NOT NULL,
        "recipientId" uuid,
        "recipientWalletAddress" character varying NOT NULL,
        "amount" numeric(18, 6) NOT NULL,
        "transactionSignature" character varying(100) NOT NULL,
        "contentType" "public"."tips_contentType_enum",
        "contentId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tips_id" PRIMARY KEY ("id")
      )
    `);

    // 2d. Add index for transaction signature
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_tips_transactionSignature" ON "tips" ("transactionSignature")
    `);

    // 2e. Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "tips"
      ADD CONSTRAINT "FK_tips_senderId_users_id" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "tips"
      ADD CONSTRAINT "FK_tips_recipientId_users_id" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // ---- Step 3: Insert Tipper Badge ----
    // Use parameterized query for safety, category is now guaranteed to exist
    await queryRunner.query(
      `INSERT INTO "badges" (
        "id", "name", "description", "category", "requirement", 
        "threshold_value", "is_active", "created_at", "updated_at"
      ) VALUES (
        uuid_generate_v4(), $1, $2, $3, $4, 
        $5, $6, now(), now()
      ) ON CONFLICT ("name") DO NOTHING`,
      [
        'Tipper', // $1: name
        'Awarded for sending your first tip to another user.', // $2: description
        'tipping', // $3: category (use lowercase)
        'Send 1 tip', // $4: requirement
        1, // $5: threshold_value
        true, // $6: is_active
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop/revert in reverse order of creation

    // ---- Step 3: Remove Tipper Badge ----
    // Moved this delete to run *before* altering the enum type
    await queryRunner.query(
      `DELETE FROM "badges" WHERE "name" = $1 AND "category" = $2`,
      ['Tipper', 'tipping'], // Use lowercase
    );

    // ---- Step 2: Drop Tipping Schema ----
    // 2e. Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "tips" DROP CONSTRAINT "FK_tips_recipientId_users_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tips" DROP CONSTRAINT "FK_tips_senderId_users_id"`,
    );
    // 2d. Drop index
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tips_transactionSignature"`,
    );
    // 2c. Drop the 'tips' table
    await queryRunner.query(`DROP TABLE "tips"`);
    // 2a. Drop the enum type for tip contentType (if it exists)
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."tips_contentType_enum"`,
    );

    // ---- Step 1: Revert badges_category_enum ----
    // 1d. Create old enum version (including ranking, without tipping)
    await queryRunner.query(
      `CREATE TYPE "public"."badges_category_enum_old" AS ENUM${this.oldBadgeCategories}`,
    );
    // 1c. Alter badges table back to the old enum type
    // This should now work as conflicting data was deleted above
    await queryRunner.query(
      `ALTER TABLE "badges" ALTER COLUMN "category" TYPE "public"."badges_category_enum_old" USING "category"::"text"::"public"."badges_category_enum_old"`,
    );
    // 1b. Drop the current enum (which includes tipping)
    await queryRunner.query(`DROP TYPE "public"."badges_category_enum"`);
    // 1a. Rename old enum back to the original name
    await queryRunner.query(
      `ALTER TYPE "public"."badges_category_enum_old" RENAME TO "badges_category_enum"`,
    );
  }
}
