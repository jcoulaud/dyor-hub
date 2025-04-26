import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { WatchlistFolderEntity } from './watchlist-folder.entity';

@Entity('user_watchlist_folder_items')
@Unique(['folderId', 'watchedUserId'])
export class UserWatchlistFolderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WatchlistFolderEntity, (folder) => folder.userItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'folder_id' })
  folder: WatchlistFolderEntity;

  @Column({ name: 'folder_id', type: 'uuid' })
  folderId: string;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'watched_user_id',
    referencedColumnName: 'id',
  })
  watchedUser: UserEntity;

  @Column({ name: 'watched_user_id', type: 'uuid' })
  watchedUserId: string;

  @Column({ name: 'position', type: 'int', default: 0 })
  position: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
