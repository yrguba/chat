import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { ContactEntity } from "./contact.entity";
import { MessageEntity } from "./message.entity";

@Entity()
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ nullable: false, unique: true })
  phone: string;
  @Column({ nullable: false })
  code?: string;
  @Column({ nullable: true })
  name: string;
  @Column({ nullable: true })
  nickname: string;
  @Column({ nullable: true })
  email: string;
  @Column({ nullable: true })
  birth: string;
  @Column({ nullable: true })
  avatar: string;
  @Column({ nullable: true })
  contactName: string;
  @Column({ nullable: true })
  player_id?: string;
  @Column({ nullable: true })
  socket_id?: string;
  @Column({ nullable: true, default: false })
  is_online: boolean;
  @Column({ nullable: true })
  last_active: Date;
  @OneToMany(() => ContactEntity, (contact) => contact.user)
  contact?: ContactEntity[];
  @OneToMany(() => MessageEntity, (message) => message.user)
  message?: MessageEntity[];
  @Column({ nullable: true })
  refresh_token?: string;
  @Column("text", { array: true, nullable: true, default: [] })
  fb_tokens?: string[];
}
