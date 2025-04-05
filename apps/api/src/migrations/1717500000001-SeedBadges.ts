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
        ('First Vote', 'Cast your first vote', 'voting', 'VOTES_CAST_COUNT', 1, true),
        ('10 Votes', 'Cast 10 votes', 'voting', 'VOTES_CAST_COUNT', 10, true),
        ('50 Votes', 'Cast 50 votes', 'voting', 'VOTES_CAST_COUNT', 50, true),
        ('500 Votes', 'Cast 500 votes', 'voting', 'VOTES_CAST_COUNT', 500, true)
    `);

    // Reception Badges
    await queryRunner.query(`
      INSERT INTO badges (name, description, category, requirement, threshold_value, is_active)
      VALUES 
        ('First Upvote', 'Receive your first upvote', 'reception', 'UPVOTES_RECEIVED_COUNT', 1, true),
        ('10 Upvotes', 'Receive 10 upvotes', 'reception', 'UPVOTES_RECEIVED_COUNT', 10, true),
        ('50 Upvotes', 'Receive 50 upvotes', 'reception', 'UPVOTES_RECEIVED_COUNT', 50, true),
        ('100 Upvotes', 'Receive 100 upvotes', 'reception', 'UPVOTES_RECEIVED_COUNT', 100, true)
    `);

    // Quality Badges
    await queryRunner.query(`
      INSERT INTO badges (name, description, category, requirement, threshold_value, is_active)
      VALUES 
        ('Rising Star', 'Achieve a post with 5 upvotes', 'quality', 'MAX_POST_UPVOTES', 5, true),
        ('Top Contributor', 'Achieve a post with 20 upvotes', 'quality', 'MAX_POST_UPVOTES', 20, true),
        ('Community Star', 'Achieve a post with 50 upvotes', 'quality', 'MAX_POST_UPVOTES', 50, true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM badges`);
  }
}
