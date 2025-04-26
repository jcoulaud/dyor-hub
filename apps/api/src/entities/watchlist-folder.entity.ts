import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TokenWatchlistFolderItemEntity } from './token-watchlist-folder-item.entity';
import { UserWatchlistFolderItemEntity } from './user-watchlist-folder-item.entity';
import { UserEntity } from './user.entity';

@Entity('watchlist_folders')
export class WatchlistFolderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'position', type: 'int', default: 0 })
  position: number;

  @Column({ name: 'folder_type', type: 'varchar', default: 'token' })
  folderType: 'token' | 'user';

  @ManyToOne(() => UserEntity, (user) => user.watchlistFolders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToMany(() => TokenWatchlistFolderItemEntity, (item) => item.folder, {
    cascade: true,
  })
  tokenItems: TokenWatchlistFolderItemEntity[];

  @OneToMany(() => UserWatchlistFolderItemEntity, (item) => item.folder, {
    cascade: true,
  })
  userItems: UserWatchlistFolderItemEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
