import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMoreBadges1744029211346 implements MigrationInterface {
  name = 'AddMoreBadges1744029211346';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ranking Badges (Removed explicit ID - let DB generate UUID)
    await queryRunner.query(`
          INSERT INTO badges (name, description, category, requirement, threshold_value, is_active)
          VALUES
            ('Top 5% Reputation', 'Achieved top 5% ranking on the all-time reputation leaderboard this week.', 'ranking', 'TOP_PERCENT_WEEKLY', 5, true)
        `);

    // Comment Interaction Badges
    await queryRunner.query(`
          INSERT INTO badges (name, description, category, requirement, threshold_value, is_active)
          VALUES
            ('Discussion Starter', 'Receive replies on 10 different comments', 'reception', 'COMMENTS_RECEIVED_COUNT', 10, true),
            ('Valuable Comment', 'Achieve a comment with 10 upvotes', 'quality', 'MAX_COMMENT_UPVOTES', 10, true)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete the specific badges added in this migration based on other unique properties
    await queryRunner.query(
      `DELETE FROM badges WHERE requirement = 'TOP_PERCENT_WEEKLY' AND threshold_value = 5 AND category = 'ranking'`,
    );
    await queryRunner.query(
      `DELETE FROM badges WHERE requirement = 'COMMENTS_RECEIVED_COUNT' AND threshold_value = 10`,
    );
    await queryRunner.query(
      `DELETE FROM badges WHERE requirement = 'MAX_COMMENT_UPVOTES' AND threshold_value = 10`,
    );
  }
}
