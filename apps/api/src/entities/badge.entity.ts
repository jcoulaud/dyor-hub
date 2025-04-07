import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BadgeCategory {
  STREAK = 'streak',
  CONTENT = 'content',
  ENGAGEMENT = 'engagement',
  VOTING = 'voting',
  RECEPTION = 'reception',
  QUALITY = 'quality',
}

@Entity('badges')
export class BadgeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar', unique: true })
  name: string;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({
    name: 'category',
    type: 'enum',
    enum: BadgeCategory,
  })
  category: BadgeCategory;

  @Column({ name: 'requirement', type: 'varchar' })
  requirement: string;

  @Column({ name: 'threshold_value', type: 'integer', default: 0 })
  thresholdValue: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
