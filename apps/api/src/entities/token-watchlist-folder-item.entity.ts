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
import { TokenEntity } from './token.entity';
import { WatchlistFolderEntity } from './watchlist-folder.entity';

@Entity('token_watchlist_folder_items')
@Unique(['folderId', 'tokenMintAddress'])
export class TokenWatchlistFolderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WatchlistFolderEntity, (folder) => folder.tokenItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'folder_id' })
  folder: WatchlistFolderEntity;

  @Column({ name: 'folder_id', type: 'uuid' })
  folderId: string;

  @ManyToOne(() => TokenEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'token_mint_address',
    referencedColumnName: 'mintAddress',
  })
  token: TokenEntity;

  @Column({ name: 'token_mint_address', type: 'varchar' })
  tokenMintAddress: string;

  @Column({ name: 'position', type: 'int', default: 0 })
  position: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
