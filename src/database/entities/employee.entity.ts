import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class EmployeeEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ nullable: true, unique: true })
  phone: string;
  @Column({ nullable: false })
  name: string;
  @Column({ nullable: true })
  password: string;
  @Column({ nullable: true })
  email: string;
  @Column({ nullable: true })
  birth: string;
  @Column({ nullable: true })
  avatar: string;
  @Column({ nullable: true })
  player_id?: string;
  @Column({ nullable: true })
  onesignal_player_id?: string;
  @Column({ nullable: true })
  socket_id?: string;
  @Column({ nullable: true, default: false })
  is_online: boolean;
  @Column({ nullable: true })
  last_active: Date;
}
