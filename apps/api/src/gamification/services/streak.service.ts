import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStreakEntity } from '../../entities';

@Injectable()
export class StreakService {
  constructor(
    @InjectRepository(UserStreakEntity)
    private readonly userStreakRepository: Repository<UserStreakEntity>,
  ) {}

  async getUserStreak(userId: string): Promise<UserStreakEntity | null> {
    return this.userStreakRepository.findOne({
      where: { userId },
    });
  }
}
