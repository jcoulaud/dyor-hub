import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class CreditPackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('int')
  credits: number;

  @Column('decimal', { precision: 10, scale: 6 })
  solPrice: number;

  @Column({ default: true })
  isActive: boolean;
}
