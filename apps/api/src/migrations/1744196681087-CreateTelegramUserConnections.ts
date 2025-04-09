import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTelegramUserConnections1744196681087
  implements MigrationInterface
{
  name = 'CreateTelegramUserConnections1744196681087';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "telegram_user_connections" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "telegram_chat_id" character varying,
                "telegram_username" character varying,
                "telegram_first_name" character varying,
                "connection_status" character varying NOT NULL DEFAULT 'active',
                "connection_token" character varying,
                "token_expires_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_2a7d64a58fc57d66993fd5f7970" UNIQUE ("user_id"),
                CONSTRAINT "PK_5be537d3035473f8d7811caf10e" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            ALTER TABLE "telegram_user_connections" 
            ADD CONSTRAINT "FK_2a7d64a58fc57d66993fd5f7970" 
            FOREIGN KEY ("user_id") 
            REFERENCES "users"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "telegram_user_connections" 
            DROP CONSTRAINT "FK_2a7d64a58fc57d66993fd5f7970"
        `);

    await queryRunner.query(`
            DROP TABLE "telegram_user_connections"
        `);
  }
}
