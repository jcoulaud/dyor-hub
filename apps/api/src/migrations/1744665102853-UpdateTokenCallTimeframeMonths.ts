import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTokenCallTimeframeMonths1744665102853
  implements MigrationInterface
{
  name = 'UpdateTokenCallTimeframeMonths1744665102853';

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.log(
      "Updating timeframeDuration: changing 'm' (old months) to 'M' (new months)...",
    );
    await queryRunner.query(`
            UPDATE "token_calls"
            SET "timeframe_duration" = REPLACE("timeframe_duration", 'm', 'M')
            WHERE "timeframe_duration" ~ '^\\d+m$' -- Only update rows ending in lowercase 'm'
        `);
    this.log('Finished updating timeframeDuration.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.log("Reverting timeframeDuration: changing 'M' back to 'm'...");
    await queryRunner.query(`
            UPDATE "token_calls"
            SET "timeframe_duration" = REPLACE("timeframe_duration", 'M', 'm')
            WHERE "timeframe_duration" ~ '^\\d+M$' -- Only revert rows ending in uppercase 'M'
        `);
    this.log('Finished reverting timeframeDuration.');
  }

  // Helper for logging
  private log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }
}
