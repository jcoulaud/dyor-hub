import { Controller, Get } from '@nestjs/common';
import { STREAK_MILESTONE_BONUS } from '../constants/reputation-points';

@Controller('gamification/streaks')
export class StreakController {
  @Get('milestones')
  getMilestones() {
    const milestones = Object.entries(STREAK_MILESTONE_BONUS).map(
      ([days, bonus]) => ({
        days: parseInt(days, 10),
        bonus,
      }),
    );

    milestones.sort((a, b) => a.days - b.days);

    return { milestones };
  }
}
