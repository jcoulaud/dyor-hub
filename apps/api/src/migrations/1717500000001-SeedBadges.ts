import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedBadges1717500000001 implements MigrationInterface {
  name = 'SeedBadges1717500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Streak Badges
    await queryRunner.query(`
      INSERT INTO badges (name, description, category, requirement, threshold_value, is_active)
      VALUES 
        ('3-Day Streak', 'Maintain a daily streak for 3 days', 'streak', 'CURRENT_STREAK', 3, true),
        ('7-Day Streak', 'Maintain a daily streak for 7 days', 'streak', 'CURRENT_STREAK', 7, true),
        ('14-Day Streak', 'Maintain a daily streak for 14 days', 'streak', 'CURRENT_STREAK', 14, true),
        ('30-Day Streak', 'Maintain a daily streak for 30 days', 'streak', 'CURRENT_STREAK', 30, true),
        ('60-Day Streak', 'Maintain a daily streak for 60 days', 'streak', 'CURRENT_STREAK', 60, true),
        ('100-Day Streak', 'Maintain a daily streak for 100 days', 'streak', 'CURRENT_STREAK', 100, true),
        ('365-Day Streak', 'Maintain a daily streak for a full year', 'streak', 'CURRENT_STREAK', 365, true)
    `);

    // Content Creator Badges
    await queryRunner.query(`
      INSERT INTO badges (name, description, category, requirement, threshold_value, is_active)
      VALUES 
        ('First Post', 'Create your first post', 'content', 'POSTS_COUNT', 1, true),
        ('5 Posts', 'Create 5 posts', 'content', 'POSTS_COUNT', 5, true),
        ('10 Posts', 'Create 10 posts', 'content', 'POSTS_COUNT', 10, true),
        ('25 Posts', 'Create 25 posts', 'content', 'POSTS_COUNT', 25, true)
    `);

    // Engagement Badges
    await queryRunner.query(`
      INSERT INTO badges (name, description, category, requirement, threshold_value, is_active)
      VALUES 
        ('First Comment', 'Leave your first comment', 'engagement', 'COMMENTS_COUNT', 1, true),
        ('10 Comments', 'Leave 10 comments', 'engagement', 'COMMENTS_COUNT', 10, true),
        ('50 Comments', 'Leave 50 comments', 'engagement', 'COMMENTS_COUNT', 50, true),
        ('200 Comments', 'Leave 200 comments', 'engagement', 'COMMENTS_COUNT', 200, true)
    `);

    // Voting Badges
    await queryRunner.query(`
      INSERT INTO badges (name, description, category, requirement, threshold_value, is_active)
      VALUES 
        ('First Upvote', 'Gave your first upvote', '${BadgeCategory.VOTING}', 'upvotes_given_count', 1, true),
        ('25 Upvotes', 'Gave 25 upvotes', '${BadgeCategory.VOTING}', 'upvotes_given_count', 25, true),
        ('100 Upvotes', 'Gave 100 upvotes', '${BadgeCategory.VOTING}', 'upvotes_given_count', 100, true),
        ('500 Upvotes', 'Gave 500 upvotes', '${BadgeCategory.VOTING}', 'upvotes_given_count', 500, true)
    `);

    // Reception Badges
    await queryRunner.query(`
      INSERT INTO badges (name, description, category, requirement, threshold_value, is_active)
      VALUES 
        ('First Upvote Received', 'Received your first upvote', '${BadgeCategory.RECEPTION}', 'upvotes_received_count', 1, true),
        ('10 Upvotes Received', 'Received 10 upvotes', '${BadgeCategory.RECEPTION}', 'upvotes_received_count', 10, true),
        ('50 Upvotes Received', 'Received 50 upvotes', '${BadgeCategory.RECEPTION}', 'upvotes_received_count', 50, true),
        ('100 Upvotes Received', 'Received 100 upvotes', '${BadgeCategory.RECEPTION}', 'upvotes_received_count', 100, true)
    `);

    // Quality Badges
    await queryRunner.query(`
      INSERT INTO badges (name, description, category, requirement, threshold_value, is_active)
      VALUES 
        ('Insightful', 'Created a comment that received 5+ upvotes', '${BadgeCategory.QUALITY}', 'comment_min_upvotes', 5, true),
        ('Popular', 'Created a top-level comment that received 10+ upvotes', '${BadgeCategory.QUALITY}', 'post_min_upvotes', 10, true),
        ('Trend Setter', 'Ranked in the top 5% for weekly reputation or content engagement', '${BadgeCategory.QUALITY}', 'top_percent_weekly', 5, true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM badges`);
  }
}
