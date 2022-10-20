import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
} from "typeorm";
import { ChatsEntity } from "./chats.entity";
import { UserEntity } from "./user.entity";
import { messageStatuses } from "../../chats/constants";

@Entity()
export class MessageEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ nullable: true })
  initiator_id: number;
  @Column({ nullable: true })
  author_id?: number;
  @Column({ nullable: true })
  reply_message_id?: number;
  @Column({ nullable: false })
  text: string;
  @Column({ nullable: false, default: "text" })
  message_type: string;
  @CreateDateColumn()
  created_at: Date;
  @Column({ nullable: false, default: false })
  is_edited: boolean;
  @Column({ nullable: false, default: messageStatuses.sent })
  message_status: string;
  @Column("int", { array: true, default: [] })
  access?: number[];
  @Column("int", { array: true, default: [] })
  accessChats?: number[];
  @ManyToOne(() => ChatsEntity, (chat) => chat.message, {
    onDelete: "CASCADE",
  })
  chat?: ChatsEntity;
  @ManyToOne(() => UserEntity, (user) => user.message, {
    onDelete: "CASCADE",
  })
  user: UserEntity;
  replyMessage?: MessageEntity
}
