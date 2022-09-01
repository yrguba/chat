import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne
} from 'typeorm';
import { ChatsEntity } from "./chats.entity";
import { UserEntity } from "./user.entity";

@Entity()
export class MessageEntity {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({ nullable: true })
    initiator_id: number;
    @Column({ nullable: false })
    text: string;
    @Column({ nullable: false, default: 'text' })
    message_type: string;
    @CreateDateColumn()
    created_at: Date;
    @ManyToOne(() => ChatsEntity, (chat) => chat.message, {
        onDelete: 'CASCADE',
    })
    chat: ChatsEntity;
    @ManyToOne(() => UserEntity, (user) => user.message, {
        onDelete: 'CASCADE',
    })
    user: UserEntity;
}
