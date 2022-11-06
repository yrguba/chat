import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { MessageEntity } from "./message.entity";

@Entity()
export class ChatsEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ nullable: true, default: "Чат" })
  name: string;
  @CreateDateColumn()
  created_at: Date;
  @Column({ nullable: true, default: new Date() })
  updated_at: Date;
  @Column("int", { array: true })
  users: number[];
  @OneToMany(() => MessageEntity, (message) => message.chat)
  message?: MessageEntity[];
  @Column({ nullable: true, default: "" })
  avatar: string;
  @Column({ nullable: true, default: false })
  is_group: boolean;
  @Column("int", { array: true, default: [] })
  listeners: number[];
  @Column("varchar", { array: true, default: [] })
  permittedReactions: string[];
  @Column({ nullable: true, default: 0 })
  pending_messages: number;
  chatUsers: any;
  replyMessage?: MessageEntity;
  totalMessages: number;
}
