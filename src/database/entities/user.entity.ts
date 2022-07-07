import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ nullable: false, unique: true })
  phone: string;
  @Column({ nullable: false })
  code: string;
  @Column({ nullable: true })
  name: string;
  @Column({ nullable: true })
  login: string;
  @Column({ nullable: true })
  email: string;
  @Column({ nullable: true })
  birth: string;
  @Column({ nullable: true })
  player_id: string;
}
