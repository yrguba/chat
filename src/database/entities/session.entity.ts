import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { UserEntity } from "./user.entity";

@Entity()
export class SessionEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ nullable: false, unique: true })
  identifier: string;
  @Column({ nullable: false, default: "" })
  device_type?: string;
  @Column({ nullable: false, default: "" })
  os_name?: string;
  @Column({ nullable: false, default: "" })
  browser?: string;
  @Column({ nullable: false, default: "" })
  location?: string;
  @Column({ nullable: false, default: "" })
  refresh_token?: string;
  @Column({ nullable: true, default: "" })
  firebase_token?: string;
  @Column({ nullable: true, default: "" })
  onesignal_player_id?: string;
  @ManyToOne(() => UserEntity, (user) => user.sessions)
  user: UserEntity;
}
