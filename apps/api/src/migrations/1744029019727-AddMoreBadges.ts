import { MigrationInterface, QueryRunner } from 'typeorm';

// Assuming this is the earlier generated migration causing issues
export class AddMoreBadges1744029019727 implements MigrationInterface {
  name = 'AddMoreBadges1744029019727';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove any automatically added enum logic here
    // We only want badge inserts in the *later* migration (1744029211346)
    this.log(
      'Skipping potentially problematic enum changes in AddMoreBadges1744029019727.up',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove any automatically added enum logic here
    this.log(
      'Skipping potentially problematic enum changes in AddMoreBadges1744029019727.down',
    );
  }

  // Helper to avoid breaking if console isn't available in all contexts
  private log(message: string) {
    if (typeof console !== 'undefined' && console.log) {
      console.log(message);
    }
  }
}
