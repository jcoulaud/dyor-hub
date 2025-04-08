import {
  BadgeRequirement,
  LeaderboardCategory,
  LeaderboardTimeframe,
  NotificationType,
} from '@dyor-hub/types';
import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../datasource';
import {
  ActivityType,
  BadgeCategory,
  BadgeEntity,
  CommentEntity,
  CommentVoteEntity,
  LeaderboardEntity,
  NotificationEntity,
  NotificationPreferenceEntity,
  TokenEntity,
  TokenWatchlistEntity,
  UserActivityEntity,
  UserBadgeEntity,
  UserEntity,
  UserReputationEntity,
  UserStreakEntity,
  WalletEntity,
} from '../entities';

// Configuration
const NUM_USERS = 100;
const NUM_TOKENS = 50;
const NUM_COMMENTS = 500;
const NUM_VOTES = 1000;
const NUM_WALLETS = 150;
const NUM_ACTIVITIES = 800;
const NUM_NOTIFICATIONS = 300;

// Solana token addresses to use in seeding
const TOKEN_ADDRESSES = [
  'YbuURTses32NtSGyyWZzwaUWnoNTAbFjdYaC1nGpump',
  'eL5fUxj2J4CiQsmW85k5FG9DvuQjjUoBHoQBi2Kpump',
  'CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump',
  '9gyfbPVwwZx4y1hotNSLcqXCQNpNqqz6ZRvo8yTLpump',
  'FtUEW73K6vEYHfbkfpdBZfWpxgQar2HipGdbutEhpump',
  'CN162nCPpq3DxPCyKLbAvEJeB1aCxsnVTEG4ZU8vpump',
  'h5NciPdMZ5QCB5BYETJMYBMpVx9ZuitR6HcVjyBhood',
  '9CMi4UyHbhhmoqcf6thKUWSZ6rAuwafQJd7u2CB8pump',
  '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
  'C7heQqfNzdMbUFQwcHkL9FvdwsFsDRBnfwZDDyWYCLTZ',
  'GHichsGq8aPnqJyz6Jp1ASTK4PNLpB5KrD6XrfDjpump',
  'GmMautNDHVBsaxt2W38SMi2kqAgrG1HZJkHhdE7Ypump',
  'E1jCTXdkMRoawoWoqfbhiNkkLbxcSHPssMo36U84pump',
  'GYTd9XbZTfwicCV28LGkwiDF4DgpXTTAi2UeCajfpump',
  'GwkEDwePTa6aFosh9xzAniGK1zvLrQ5yPJfLnqwmuyhG',
  '98mb39tPFKQJ4Bif8iVg9mYb9wsfPZgpgN1sxoVTpump',
  '63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9',
  'Hrh6QCmnGjtq3gqg4xZzncXS7wAWeVmu7SCRfQ4N5H6S',
  'znv3FZt2HFAvzYf5LxzVyryh3mBXWuTRRng25gEZAjh',
  'y1AZt42vceCmStjW4zetK3VoNarC1VxJ5iDjpiupump',
  '9Y7myWuGEY9kT4Z9nKXPXWZEhRd2hJQ85nCK4Hjs8oX2',
  'WPgmcrani3ZybubqiZmMRP4XWGyUkMu8DeBTq8Kpump',
  'DP9WkSbYmNoLAoDA5ti8CLMoraneSM8ECVURkA5vKwnY',
  '5vX4JdxapxpUfUdSy6gjatUSXbknfavqVbo1XVB69xUM',
  '6gVJwfHxWov8HxdAZ4v4tt2RpZZst6du74y4bUCdpump',
  '36fBDB9fNZkz6QcLAWXJ55nKrgrMcWh2KAXbMMZU2Mam',
  'CoVHTmy5SrNbu4tG25qHPKk6FXJR11BqqZ3Nhd21pump',
  '6q387cQFB2bobtdJGAMVVW5NoVL94KKmHXmEPgwUpump',
  'D5xQLnpMGRcPmfE3dHKBkDdKPwdP9vVn5pwjXhAv5NCR',
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  'GAnBrQPmtqNwUNsnokMK9UnBAYXVpgW3zwLtJxnvpump',
  'Am7JhDobbHyLQddddy6pGzRtpjXGTVu7gXdjJkZ8pump',
  'DJ9WyFyL69ArymKC2Q6b8AGefDN2vWDvPozytVNApump',
  'FAxgxFYM2bg9TpT815yForkPrSZf7hrCn8wK1eqEpump',
  '24KWXRNGbBYjxuMt6xYsFqLhiVeToCr3Fei98QSWpump',
  '8uBiBsBHHndwsVqtWCHvJ5qBY7iUvLwyAuVAxWBEpump',
  '3T721bpRc5FNY84W36vWffxoKs4FLXhBpSaqwUCRpump',
  'CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump',
  '61V8vBaqAGMpgDQi4JcAwo1dmBGHsyhzodcPqnEVpump',
  'Cn5Ne1vmR9ctMGY9z5NC71A3NYFvopjXNyxYtfVYpump',
  '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
  '2oYvo4nJ5LgGob48RbJncFDoksicWKakTG1fsT36pump',
  '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv',
  '8FSffhFjeAH5nbFsG6RGLDhaN5RmSzSorEKdG51mpump',
  '34HDZNbUkTyTrgYKy2ox43yp2f8PJ5hoM7xsrfNApump',
  'HN8yLhpHVkzAk1dLNxZTvPLoYwxrUusM7svbnSyLsPzQ',
  '2MCmXsjSXHoQYR6ckg6Af4mhQKDMJMGy6JKh8C4Qpump',
  'HNg5PYJmtqcmzXrv6S9zP1CDKk5BgDuyFBxbvNApump',
  'CJtzt1ZHAPY7zGMv5PMZdvn6DdXmBPP86xNBRbkMpump',
  'GAgsxGrx1cCekzGV1m96QTgV9Wy2JtcBAyKjTKhdpump',
];

// Verify that we have exactly NUM_TOKENS addresses
if (TOKEN_ADDRESSES.length !== NUM_TOKENS) {
  throw new Error(
    `TOKEN_ADDRESSES length (${TOKEN_ADDRESSES.length}) does not match NUM_TOKENS (${NUM_TOKENS})`,
  );
}

async function seedDatabase() {
  console.log('Starting database seeding...');

  // Initialize database connection without running migrations
  const dataSource = new DataSource({
    ...dataSourceOptions,
    migrationsRun: false, // Don't run migrations during seeding
  });

  await dataSource.initialize();

  try {
    // Create repositories
    const userRepository = dataSource.getRepository(UserEntity);
    const tokenRepository = dataSource.getRepository(TokenEntity);
    const commentRepository = dataSource.getRepository(CommentEntity);
    const commentVoteRepository = dataSource.getRepository(CommentVoteEntity);
    const walletRepository = dataSource.getRepository(WalletEntity);
    const tokenWatchlistRepository =
      dataSource.getRepository(TokenWatchlistEntity);
    const userActivityRepository = dataSource.getRepository(UserActivityEntity);
    const userStreakRepository = dataSource.getRepository(UserStreakEntity);
    const badgeRepository = dataSource.getRepository(BadgeEntity);
    const userBadgeRepository = dataSource.getRepository(UserBadgeEntity);
    const userReputationRepository =
      dataSource.getRepository(UserReputationEntity);
    const notificationRepository = dataSource.getRepository(NotificationEntity);
    const notificationPreferenceRepository = dataSource.getRepository(
      NotificationPreferenceEntity,
    );
    const leaderboardRepository = dataSource.getRepository(LeaderboardEntity);

    // Seed Users
    console.log('Seeding users...');
    const users: UserEntity[] = [];
    for (let i = 0; i < NUM_USERS; i++) {
      const user = new UserEntity();
      user.twitterId = faker.string.uuid();
      user.username = faker.internet.username();
      user.displayName = faker.person.fullName();
      user.avatarUrl = faker.image.avatar();
      user.twitterAccessToken = faker.string.alphanumeric(40);
      user.twitterRefreshToken = faker.string.alphanumeric(40);
      user.isAdmin = faker.helpers.arrayElement([
        true,
        false,
        false,
        false,
        false,
      ]); // 20% chance of being admin
      user.preferences = {};

      users.push(user);
    }
    const savedUsers = await userRepository.save(users);
    console.log(`${savedUsers.length} users created`);

    // Seed Tokens
    console.log('Seeding tokens...');
    const tokens: TokenEntity[] = [];
    for (let i = 0; i < NUM_TOKENS; i++) {
      const token = new TokenEntity();
      token.mintAddress = TOKEN_ADDRESSES[i];
      token.name = faker.company.name() + ' Token';
      token.symbol = token.name.split(' ')[0].substring(0, 5).toUpperCase();
      token.description = faker.company.catchPhrase();
      token.imageUrl = faker.image.url({ width: 200, height: 200 });
      token.websiteUrl = faker.internet.url();
      token.telegramUrl = `https://t.me/${faker.internet.username()}`;
      token.twitterHandle = faker.internet.username();
      token.viewsCount = faker.number.int({ min: 0, max: 50000 });

      tokens.push(token);
    }
    const savedTokens = await tokenRepository.save(tokens);
    console.log(`${savedTokens.length} tokens created`);

    // Seed User Reputation
    console.log('Seeding user reputation...');
    const reputations: UserReputationEntity[] = [];
    for (const user of savedUsers) {
      const reputation = new UserReputationEntity();
      reputation.user = user;
      reputation.totalPoints = faker.number.int({ min: 0, max: 1000 });
      reputation.weeklyPoints = faker.number.int({ min: 0, max: 100 });
      reputations.push(reputation);
    }
    await userReputationRepository.save(reputations);
    console.log(`${reputations.length} user reputations created`);

    // Seed User Streaks
    console.log('Seeding user streaks...');
    const streaks: UserStreakEntity[] = [];
    for (const user of savedUsers) {
      const streak = new UserStreakEntity();
      streak.user = user;
      streak.currentStreak = faker.number.int({ min: 0, max: 30 });
      streak.longestStreak = faker.number.int({
        min: streak.currentStreak,
        max: 100,
      });
      streak.lastActivityDate = faker.date.recent({ days: 2 });
      streaks.push(streak);
    }
    await userStreakRepository.save(streaks);
    console.log(`${streaks.length} user streaks created`);

    // Seed Badges
    console.log('Seeding badges...');
    const badges: BadgeEntity[] = [];

    // Create badges exactly matching those in the SeedBadges migration

    // Streak Badges
    const streakBadges = [
      {
        name: '3-Day Streak',
        description: 'Maintain a daily streak for 3 days',
        category: BadgeCategory.STREAK,
        requirement: BadgeRequirement.CURRENT_STREAK,
        thresholdValue: 3,
      },
      {
        name: '7-Day Streak',
        description: 'Maintain a daily streak for 7 days',
        category: BadgeCategory.STREAK,
        requirement: BadgeRequirement.CURRENT_STREAK,
        thresholdValue: 7,
      },
      {
        name: '14-Day Streak',
        description: 'Maintain a daily streak for 14 days',
        category: BadgeCategory.STREAK,
        requirement: BadgeRequirement.CURRENT_STREAK,
        thresholdValue: 14,
      },
      {
        name: '30-Day Streak',
        description: 'Maintain a daily streak for 30 days',
        category: BadgeCategory.STREAK,
        requirement: BadgeRequirement.CURRENT_STREAK,
        thresholdValue: 30,
      },
      {
        name: '60-Day Streak',
        description: 'Maintain a daily streak for 60 days',
        category: BadgeCategory.STREAK,
        requirement: BadgeRequirement.CURRENT_STREAK,
        thresholdValue: 60,
      },
      {
        name: '100-Day Streak',
        description: 'Maintain a daily streak for 100 days',
        category: BadgeCategory.STREAK,
        requirement: BadgeRequirement.CURRENT_STREAK,
        thresholdValue: 100,
      },
      {
        name: '365-Day Streak',
        description: 'Maintain a daily streak for a full year',
        category: BadgeCategory.STREAK,
        requirement: BadgeRequirement.CURRENT_STREAK,
        thresholdValue: 365,
      },
    ];

    // Content Creator Badges
    const contentBadges = [
      {
        name: 'First Post',
        description: 'Create your first post',
        category: BadgeCategory.CONTENT,
        requirement: BadgeRequirement.POSTS_COUNT,
        thresholdValue: 1,
      },
      {
        name: '5 Posts',
        description: 'Create 5 posts',
        category: BadgeCategory.CONTENT,
        requirement: BadgeRequirement.POSTS_COUNT,
        thresholdValue: 5,
      },
      {
        name: '10 Posts',
        description: 'Create 10 posts',
        category: BadgeCategory.CONTENT,
        requirement: BadgeRequirement.POSTS_COUNT,
        thresholdValue: 10,
      },
      {
        name: '25 Posts',
        description: 'Create 25 posts',
        category: BadgeCategory.CONTENT,
        requirement: BadgeRequirement.POSTS_COUNT,
        thresholdValue: 25,
      },
    ];

    // Engagement Badges
    const engagementBadges = [
      {
        name: 'First Comment',
        description: 'Leave your first comment',
        category: BadgeCategory.ENGAGEMENT,
        requirement: BadgeRequirement.COMMENTS_COUNT,
        thresholdValue: 1,
      },
      {
        name: '10 Comments',
        description: 'Leave 10 comments',
        category: BadgeCategory.ENGAGEMENT,
        requirement: BadgeRequirement.COMMENTS_COUNT,
        thresholdValue: 10,
      },
      {
        name: '50 Comments',
        description: 'Leave 50 comments',
        category: BadgeCategory.ENGAGEMENT,
        requirement: BadgeRequirement.COMMENTS_COUNT,
        thresholdValue: 50,
      },
      {
        name: '200 Comments',
        description: 'Leave 200 comments',
        category: BadgeCategory.ENGAGEMENT,
        requirement: BadgeRequirement.COMMENTS_COUNT,
        thresholdValue: 200,
      },
    ];

    // Voting Badges
    const votingBadges = [
      {
        name: 'First Vote',
        description: 'Cast your first vote',
        category: BadgeCategory.VOTING,
        requirement: BadgeRequirement.VOTES_CAST_COUNT,
        thresholdValue: 1,
      },
      {
        name: '10 Votes',
        description: 'Cast 10 votes',
        category: BadgeCategory.VOTING,
        requirement: BadgeRequirement.VOTES_CAST_COUNT,
        thresholdValue: 10,
      },
      {
        name: '50 Votes',
        description: 'Cast 50 votes',
        category: BadgeCategory.VOTING,
        requirement: BadgeRequirement.VOTES_CAST_COUNT,
        thresholdValue: 50,
      },
      {
        name: '500 Votes',
        description: 'Cast 500 votes',
        category: BadgeCategory.VOTING,
        requirement: BadgeRequirement.VOTES_CAST_COUNT,
        thresholdValue: 500,
      },
    ];

    // Reception Badges
    const receptionBadges = [
      {
        name: 'First Upvote',
        description: 'Receive your first upvote',
        category: BadgeCategory.RECEPTION,
        requirement: BadgeRequirement.UPVOTES_RECEIVED_COUNT,
        thresholdValue: 1,
      },
      {
        name: '10 Upvotes',
        description: 'Receive 10 upvotes',
        category: BadgeCategory.RECEPTION,
        requirement: BadgeRequirement.UPVOTES_RECEIVED_COUNT,
        thresholdValue: 10,
      },
      {
        name: '50 Upvotes',
        description: 'Receive 50 upvotes',
        category: BadgeCategory.RECEPTION,
        requirement: BadgeRequirement.UPVOTES_RECEIVED_COUNT,
        thresholdValue: 50,
      },
      {
        name: '100 Upvotes',
        description: 'Receive 100 upvotes',
        category: BadgeCategory.RECEPTION,
        requirement: BadgeRequirement.UPVOTES_RECEIVED_COUNT,
        thresholdValue: 100,
      },
    ];

    // Quality Badges
    const qualityBadges = [
      {
        name: 'Rising Star',
        description: 'Achieve a post with 5 upvotes',
        category: BadgeCategory.QUALITY,
        requirement: BadgeRequirement.MAX_POST_UPVOTES,
        thresholdValue: 5,
      },
      {
        name: 'Top Contributor',
        description: 'Achieve a post with 20 upvotes',
        category: BadgeCategory.QUALITY,
        requirement: BadgeRequirement.MAX_POST_UPVOTES,
        thresholdValue: 20,
      },
      {
        name: 'Community Star',
        description: 'Achieve a post with 50 upvotes',
        category: BadgeCategory.QUALITY,
        requirement: BadgeRequirement.MAX_POST_UPVOTES,
        thresholdValue: 50,
      },
      {
        name: 'Valuable Comment',
        description: 'Achieve a comment with 10 upvotes',
        category: BadgeCategory.QUALITY,
        requirement: BadgeRequirement.MAX_COMMENT_UPVOTES,
        thresholdValue: 10,
      },
    ];

    // Ranking Badges
    const rankingBadges = [
      {
        name: 'Top 5% Reputation',
        description:
          'Achieved top 5% ranking on the all-time reputation leaderboard this week.',
        category: BadgeCategory.RECEPTION,
        requirement: BadgeRequirement.TOP_PERCENT_WEEKLY,
        thresholdValue: 5,
      },
    ];

    // Additional Reception Badges
    const additionalReceptionBadges = [
      {
        name: 'Discussion Starter',
        description: 'Receive replies on 10 different comments',
        category: BadgeCategory.RECEPTION,
        requirement: BadgeRequirement.COMMENTS_RECEIVED_COUNT,
        thresholdValue: 10,
      },
    ];

    // Combine all badge definitions
    const allBadgeDefinitions = [
      ...streakBadges,
      ...contentBadges,
      ...engagementBadges,
      ...votingBadges,
      ...receptionBadges,
      ...additionalReceptionBadges,
      ...qualityBadges,
      ...rankingBadges,
    ];

    // Create badge entities from definitions
    for (const badgeDef of allBadgeDefinitions) {
      const badge = new BadgeEntity();
      badge.name = badgeDef.name;
      badge.description = badgeDef.description;
      badge.category = badgeDef.category;
      badge.requirement = badgeDef.requirement;
      badge.thresholdValue = badgeDef.thresholdValue;
      badge.isActive = true;
      badges.push(badge);
    }

    // Save badges
    await badgeRepository.save(badges);
    console.log(`${badges.length} badges created`);

    // Get all badges for subsequent operations
    const savedBadges = await badgeRepository.find();
    console.log(`${savedBadges.length} total badges available`);

    // Seed User Badges
    console.log('Seeding user badges...');
    const userBadges: UserBadgeEntity[] = [];

    // Give each user 1-5 random badges
    for (const user of savedUsers) {
      const numBadges = faker.number.int({ min: 1, max: 5 });
      const randomBadges = faker.helpers.arrayElements(savedBadges, numBadges);

      for (const badge of randomBadges) {
        const userBadge = new UserBadgeEntity();
        userBadge.user = user;
        userBadge.badge = badge;
        userBadge.earnedAt = faker.date.past();
        userBadges.push(userBadge);
      }
    }
    await userBadgeRepository.save(userBadges);
    console.log(`${userBadges.length} user badges created`);

    // Seed Comments
    console.log('Seeding comments...');
    const comments: CommentEntity[] = [];
    for (let i = 0; i < NUM_COMMENTS; i++) {
      const comment = new CommentEntity();
      comment.user = faker.helpers.arrayElement(savedUsers);
      comment.token = faker.helpers.arrayElement(savedTokens);
      comment.content = faker.lorem.paragraph();
      comment.upvotes = 0; // Will be calculated from votes
      comment.downvotes = 0; // Will be calculated from votes

      // Some comments are replies to others
      if (i > 0 && Math.random() > 0.7 && comments.length > 0) {
        comment.parent = faker.helpers.arrayElement(comments);
      }

      comments.push(comment);
    }
    const savedComments = await commentRepository.save(comments);
    console.log(`${savedComments.length} comments created`);

    // Seed Comment Votes
    console.log('Seeding comment votes...');
    const votes: CommentVoteEntity[] = [];
    for (let i = 0; i < NUM_VOTES; i++) {
      const vote = new CommentVoteEntity();
      vote.comment = faker.helpers.arrayElement(savedComments);
      vote.user = faker.helpers.arrayElement(savedUsers);
      vote.type = faker.helpers.arrayElement(['upvote', 'downvote']);
      votes.push(vote);
    }
    await commentVoteRepository.save(votes);
    console.log(`${votes.length} comment votes created`);

    // Update comment upvote/downvote counts
    console.log('Updating comment vote counts...');
    for (const comment of savedComments) {
      const upvotes = votes.filter(
        (v) => v.comment.id === comment.id && v.type === 'upvote',
      ).length;
      const downvotes = votes.filter(
        (v) => v.comment.id === comment.id && v.type === 'downvote',
      ).length;

      await commentRepository.update(comment.id, { upvotes, downvotes });
    }
    console.log('Comment vote counts updated');

    // Seed Wallets
    console.log('Seeding wallets...');
    const wallets: WalletEntity[] = [];
    for (let i = 0; i < NUM_WALLETS; i++) {
      const wallet = new WalletEntity();
      wallet.user = faker.helpers.arrayElement(savedUsers);
      wallet.address = faker.string.alphanumeric(44); // Solana public key length
      wallet.isVerified = faker.datatype.boolean();
      wallet.isPrimary = i % 5 === 0; // Make every 5th wallet primary
      wallets.push(wallet);
    }
    await walletRepository.save(wallets);
    console.log(`${wallets.length} wallets created`);

    // Seed Token Watchlist
    console.log('Seeding token watchlist...');
    const watchlistItems: TokenWatchlistEntity[] = [];

    // Each user watches 0-10 tokens
    for (const user of savedUsers) {
      const numTokensToWatch = faker.number.int({ min: 0, max: 10 });
      const tokensToWatch = faker.helpers.arrayElements(
        savedTokens,
        numTokensToWatch,
      );

      for (const token of tokensToWatch) {
        const watchlistItem = new TokenWatchlistEntity();
        watchlistItem.user = user;
        watchlistItem.token = token;
        watchlistItems.push(watchlistItem);
      }
    }
    await tokenWatchlistRepository.save(watchlistItems);
    console.log(`${watchlistItems.length} watchlist items created`);

    // Seed User Activities
    console.log('Seeding user activities...');
    const activities: UserActivityEntity[] = [];
    const activityTypes = [
      ActivityType.COMMENT,
      ActivityType.POST,
      ActivityType.UPVOTE,
      ActivityType.DOWNVOTE,
      ActivityType.LOGIN,
    ];

    for (let i = 0; i < NUM_ACTIVITIES; i++) {
      const activity = new UserActivityEntity();
      activity.user = faker.helpers.arrayElement(savedUsers);
      activity.activityType = faker.helpers.arrayElement(activityTypes);
      activity.entityId = faker.string.uuid();
      activity.entityType = 'comment';

      // Set timestamp within last 30 days
      activity.createdAt = faker.date.recent({ days: 30 });

      activities.push(activity);
    }
    await userActivityRepository.save(activities);
    console.log(`${activities.length} user activities created`);

    // Seed Notifications
    console.log('Seeding notifications...');
    const notifications: NotificationEntity[] = [];
    const notificationTypes = [
      NotificationType.STREAK_AT_RISK,
      NotificationType.STREAK_ACHIEVED,
      NotificationType.BADGE_EARNED,
      NotificationType.COMMENT_REPLY,
      NotificationType.UPVOTE_RECEIVED,
      NotificationType.SYSTEM,
    ];

    for (let i = 0; i < NUM_NOTIFICATIONS; i++) {
      const notification = new NotificationEntity();
      notification.user = faker.helpers.arrayElement(savedUsers);
      notification.type = faker.helpers.arrayElement(notificationTypes);
      notification.message = generateNotificationMessage(notification.type);
      notification.isRead = faker.datatype.boolean();
      notification.createdAt = faker.date.recent({ days: 14 });
      notification.relatedEntityId = faker.string.uuid();
      notification.relatedEntityType = faker.helpers.arrayElement([
        'comment',
        'badge',
        'token',
      ]);

      // Add relatedMetadata based on notification type
      notification.relatedMetadata = generateNotificationMetadata(
        notification.type,
        notification.relatedEntityType,
      );

      notifications.push(notification);
    }
    await notificationRepository.save(notifications);
    console.log(`${notifications.length} notifications created`);

    // Seed Notification Preferences
    console.log('Seeding notification preferences...');
    const notificationPreferences: NotificationPreferenceEntity[] = [];

    for (const user of savedUsers) {
      for (const notificationType of Object.values(NotificationType)) {
        const preference = new NotificationPreferenceEntity();
        preference.user = user;
        preference.notificationType = notificationType;
        preference.inAppEnabled = faker.datatype.boolean();
        preference.emailEnabled = faker.datatype.boolean();
        preference.telegramEnabled = faker.datatype.boolean();

        notificationPreferences.push(preference);
      }
    }
    await notificationPreferenceRepository.save(notificationPreferences);
    console.log(
      `${notificationPreferences.length} notification preferences created`,
    );

    // Seed Leaderboard
    console.log('Seeding leaderboard...');
    const leaderboardEntries: LeaderboardEntity[] = [];

    // Use smaller subset for testing
    const timeframes = Object.values(LeaderboardTimeframe).slice(0, 2); // Just use 2 timeframes for testing
    const categories = Object.values(LeaderboardCategory).slice(0, 2); // Just use 2 categories for testing

    for (const timeframe of timeframes) {
      for (const category of categories) {
        // Get random subset of users for this leaderboard - use smaller set for testing
        const leaderboardUsers = faker.helpers
          .shuffle([...savedUsers])
          .slice(0, 10);

        for (let i = 0; i < leaderboardUsers.length; i++) {
          const entry = new LeaderboardEntity();
          entry.user = leaderboardUsers[i];
          entry.userId = leaderboardUsers[i].id; // Explicitly set userId
          entry.timeframe = timeframe;
          entry.category = category;
          entry.rank = i + 1;
          entry.score = faker.number.int({ min: 100, max: 10000 });
          entry.previousRank =
            i > 0 ? i + faker.number.int({ min: -5, max: 5 }) : null;

          leaderboardEntries.push(entry);
        }
      }
    }

    try {
      await leaderboardRepository.save(leaderboardEntries);
      console.log(`${leaderboardEntries.length} leaderboard entries created`);
    } catch (error) {
      console.error('Error saving leaderboard entries:', error.message);
      if (leaderboardEntries.length > 0) {
        console.error(
          'Sample entry:',
          JSON.stringify(
            {
              userId: leaderboardEntries[0].userId,
              timeframe: leaderboardEntries[0].timeframe,
              category: leaderboardEntries[0].category,
            },
            null,
            2,
          ),
        );
      }
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    // Close the database connection
    await dataSource.destroy();
  }
}

// Helper functions
function generateNotificationMessage(type: NotificationType): string {
  switch (type) {
    case NotificationType.COMMENT_REPLY:
      return 'Someone replied to your comment';
    case NotificationType.UPVOTE_RECEIVED:
      return 'Your comment received an upvote';
    case NotificationType.BADGE_EARNED:
      return 'You earned a new badge!';
    case NotificationType.STREAK_ACHIEVED:
      return 'Congratulations on maintaining your streak!';
    case NotificationType.STREAK_AT_RISK:
      return 'Your streak is at risk! Log in today to maintain it.';
    case NotificationType.STREAK_BROKEN:
      return 'Your streak has been reset. Start a new one today!';
    case NotificationType.LEADERBOARD_CHANGE:
      return 'Your position on the leaderboard has changed';
    case NotificationType.REPUTATION_MILESTONE:
      return "You've reached a reputation milestone!";
    case NotificationType.SYSTEM:
      return 'System notification';
    default:
      return 'New notification';
  }
}

// Helper function to generate notification metadata based on type
function generateNotificationMetadata(
  type: NotificationType,
  entityType: string,
): Record<string, any> | null {
  switch (type) {
    case NotificationType.COMMENT_REPLY:
      return {
        commentId: faker.string.uuid(),
        tokenSymbol: faker.finance.currencyCode(),
        tokenMintAddress: faker.string.alphanumeric(44),
        replyContent: faker.lorem.sentence(),
        replierUsername: faker.internet.username(),
      };
    case NotificationType.UPVOTE_RECEIVED:
      return {
        commentId: faker.string.uuid(),
        tokenSymbol: faker.finance.currencyCode(),
        upvotesCount: faker.number.int({ min: 1, max: 50 }),
      };
    case NotificationType.BADGE_EARNED:
      return {
        badgeName: faker.helpers.arrayElement([
          'Community Star',
          'First Comment',
          '7-Day Streak',
          'Discussion Starter',
          'Top 5% Reputation',
        ]),
        badgeCategory: faker.helpers.arrayElement(Object.values(BadgeCategory)),
      };
    case NotificationType.STREAK_ACHIEVED:
      return {
        streakDays: faker.number.int({ min: 2, max: 100 }),
        points: faker.number.int({ min: 10, max: 100 }),
      };
    case NotificationType.STREAK_AT_RISK:
      return {
        streakDays: faker.number.int({ min: 2, max: 100 }),
        hoursLeft: faker.number.int({ min: 1, max: 23 }),
      };
    case NotificationType.LEADERBOARD_CHANGE:
      return {
        category: faker.helpers.arrayElement(
          Object.values(LeaderboardCategory),
        ),
        timeframe: faker.helpers.arrayElement(
          Object.values(LeaderboardTimeframe),
        ),
        oldRank: faker.number.int({ min: 5, max: 100 }),
        newRank: faker.number.int({ min: 1, max: 4 }),
      };
    case NotificationType.REPUTATION_MILESTONE:
      return {
        milestone: faker.number.int({ min: 100, max: 10000 }),
        level: faker.helpers.arrayElement([
          'Bronze',
          'Silver',
          'Gold',
          'Platinum',
        ]),
      };
    case NotificationType.SYSTEM:
      return {
        title: 'System Update',
        category: faker.helpers.arrayElement([
          'maintenance',
          'feature',
          'announcement',
        ]),
        action: faker.helpers.arrayElement(['read', 'click', 'dismiss']),
      };
    default:
      return null;
  }
}

// Run the seed function if this script is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Database seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding database:', error);
      process.exit(1);
    });
}

export { seedDatabase };
