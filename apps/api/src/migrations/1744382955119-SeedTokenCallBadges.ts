import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTokenCallBadges1744382955119 implements MigrationInterface {
  name = 'SeedTokenCallBadges1744382955119';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Token Call Badges
    await queryRunner.query(`
      INSERT INTO badges (name, description, category, requirement, threshold_value, is_active)
      VALUES 
        ('First Call', 'Make your first successful token call', 'content', 'FIRST_SUCCESSFUL_TOKEN_CALL', 1, true),
        ('Beginner Caller', 'Successfully predict 5 token price movements', 'content', 'SUCCESSFUL_TOKEN_CALL_COUNT', 5, true),
        ('Intermediate Caller', 'Successfully predict 25 token price movements', 'content', 'SUCCESSFUL_TOKEN_CALL_COUNT', 25, true),
        ('Expert Caller', 'Successfully predict 100 token price movements', 'content', 'SUCCESSFUL_TOKEN_CALL_COUNT', 100, true),
        ('Sharpshooter: Bronze', 'Successfully predict 10 verified token calls', 'quality', 'VERIFIED_TOKEN_CALL_COUNT', 10, true),
        ('Sharpshooter: Silver', 'Successfully predict 25 verified token calls', 'quality', 'VERIFIED_TOKEN_CALL_COUNT', 25, true),
        ('Sharpshooter: Gold', 'Successfully predict 50 verified token calls', 'quality', 'VERIFIED_TOKEN_CALL_COUNT', 50, true),
        ('Precision: 60%', 'Maintain a 60% accuracy rate on verified token calls', 'quality', 'TOKEN_CALL_ACCURACY_RATE', 60, true),
        ('Precision: 75%', 'Maintain a 75% accuracy rate on verified token calls', 'quality', 'TOKEN_CALL_ACCURACY_RATE', 75, true),
        ('Precision: 90%', 'Maintain a 90% accuracy rate on verified token calls', 'quality', 'TOKEN_CALL_ACCURACY_RATE', 90, true),
        ('2x Moonshot', 'Successfully predict a 2x price movement', 'quality', 'TOKEN_CALL_MOONSHOT_X', 2, true),
        ('5x Moonshot', 'Successfully predict a 5x price movement', 'quality', 'TOKEN_CALL_MOONSHOT_X', 5, true),
        ('10x Moonshot', 'Successfully predict a 10x price movement', 'quality', 'TOKEN_CALL_MOONSHOT_X', 10, true),
        ('Early Bird', 'Successfully hit target within 20% of the timeframe', 'quality', 'TOKEN_CALL_EARLY_BIRD_RATIO', 20, true),
        ('Lightning Call', 'Successfully hit target within 10% of the timeframe', 'quality', 'TOKEN_CALL_EARLY_BIRD_RATIO', 10, true),
        ('3-Call Streak', 'Successfully predict 3 token calls in a row', 'streak', 'TOKEN_CALL_SUCCESS_STREAK', 3, true),
        ('5-Call Streak', 'Successfully predict 5 token calls in a row', 'streak', 'TOKEN_CALL_SUCCESS_STREAK', 5, true),
        ('10-Call Streak', 'Successfully predict 10 token calls in a row', 'streak', 'TOKEN_CALL_SUCCESS_STREAK', 10, true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete all token call badges
    await queryRunner.query(`
      DELETE FROM badges 
      WHERE requirement IN (
        'FIRST_SUCCESSFUL_TOKEN_CALL',
        'SUCCESSFUL_TOKEN_CALL_COUNT',
        'VERIFIED_TOKEN_CALL_COUNT',
        'TOKEN_CALL_ACCURACY_RATE',
        'TOKEN_CALL_MOONSHOT_X',
        'TOKEN_CALL_EARLY_BIRD_RATIO',
        'TOKEN_CALL_SUCCESS_STREAK'
      )
    `);
  }
}
