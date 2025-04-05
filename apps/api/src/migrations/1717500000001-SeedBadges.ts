import { MigrationInterface, QueryRunner } from 'typeorm';
import { BadgeCategory } from '../entities/badge.entity';

export class SeedBadges1717500000001 implements MigrationInterface {
  name = 'SeedBadges1717500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Streak Badges
    await queryRunner.query(`
      INSERT INTO badges (name, description, category, requirement, threshold_value, is_active)
      VALUES 
        ('3 Day Streak', 'Maintained activity for 3 consecutive days', '${BadgeCategory.STREAK}', 'current_streak', 3, true),
        ('7 Day Streak', 'Maintained activity for 7 consecutive days', '${BadgeCategory.STREAK}', 'current_streak', 7, true),
        ('14 Day Streak', 'Maintained activity for 14 consecutive days', '${BadgeCategory.STREAK}', 'current_streak', 14, true),
        ('30 Day Streak', 'Maintained activity for 30 consecutive days', '${BadgeCategory.STREAK}', 'current_streak', 30, true),
        ('60 Day Streak', 'Maintained activity for 60 consecutive days', '${BadgeCategory.STREAK}', 'current_streak', 60, true),
        ('100 Day Streak', 'Maintained activity for 100 consecutive days', '${BadgeCategory.STREAK}', 'current_streak', 100, true),
        ('365 Day Streak', 'Maintained activity for a full year', '${BadgeCategory.STREAK}', 'current_streak', 365, true)
    `);

    // Content Creator Badges
    await queryRunner.query(`
      INSERT INTO badges (name, description, category, requirement, threshold_value, is_active)
      VALUES 
        ('First Post', 'Published your first post', '${BadgeCategory.CONTENT}', 'posts_count', 1, true),
        ('5 Posts', 'Published 5 posts', '${BadgeCategory.CONTENT}', 'posts_count', 5, true),
        ('25 Posts', 'Published 25 posts', '${BadgeCategory.CONTENT}', 'posts_count', 25, true),
        ('100 Posts', 'Published 100 posts', '${BadgeCategory.CONTENT}', 'posts_count', 100, true)
    `);

    // Engagement Badges
    await queryRunner.query(`
      INSERT INTO badges (name, description, category, requirement, threshold_value, is_active)
      VALUES 
        ('First Comment', 'Left your first comment', '${BadgeCategory.ENGAGEMENT}', 'comments_count', 1, true),
        ('10 Comments', 'Left 10 comments', '${BadgeCategory.ENGAGEMENT}', 'comments_count', 10, true),
        ('50 Comments', 'Left 50 comments', '${BadgeCategory.ENGAGEMENT}', 'comments_count', 50, true),
        ('200 Comments', 'Left 200 comments', '${BadgeCategory.ENGAGEMENT}', 'comments_count', 200, true)
    `);

    // Voting Badges
    await queryRunner.query(`
      INSERT INTO badges (name, description, category, requirement, threshold_value, is_active)
      VALUES 
        ('First Upvote', 'Gave your first upvote', '${BadgeCategory.VOTING}', 'upvotes_given', 1, true),
        ('25 Upvotes', 'Gave 25 upvotes', '${BadgeCategory.VOTING}', 'upvotes_given', 25, true),
        ('100 Upvotes', 'Gave 100 upvotes', '${BadgeCategory.VOTING}', 'upvotes_given', 100, true),
        ('500 Upvotes', 'Gave 500 upvotes', '${BadgeCategory.VOTING}', 'upvotes_given', 500, true)
    `);

    // Reception Badges
    await queryRunner.query(`
      INSERT INTO badges (name, description, category, requirement, threshold_value, is_active)
      VALUES 
        ('First Upvote Received', 'Received your first upvote', '${BadgeCategory.RECEPTION}', 'upvotes_received', 1, true),
        ('10 Upvotes Received', 'Received 10 upvotes', '${BadgeCategory.RECEPTION}', 'upvotes_received', 10, true),
        ('50 Upvotes Received', 'Received 50 upvotes', '${BadgeCategory.RECEPTION}', 'upvotes_received', 50, true),
        ('100 Upvotes Received', 'Received 100 upvotes', '${BadgeCategory.RECEPTION}', 'upvotes_received', 100, true)
    `);

    // Quality Badges
    await queryRunner.query(`
      INSERT INTO badges (name, description, category, requirement, threshold_value, is_active)
      VALUES 
        ('Insightful', 'Created a comment that received 5+ upvotes', '${BadgeCategory.QUALITY}', 'comment_min_upvotes', 5, true),
        ('Popular', 'Created a post that received 10+ upvotes', '${BadgeCategory.QUALITY}', 'post_min_upvotes', 10, true),
        ('Trend Setter', 'Created content in the top 5% for the week', '${BadgeCategory.QUALITY}', 'top_percent_weekly', 5, true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM badges`);
  }
}
