import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    OneToMany
} from 'typeorm';
import { MessageEntity } from "./message.entity";

@Entity()
export class ChatsEntity {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({ nullable: true, default: 'Чат' })
    name: string;
    @CreateDateColumn()
    created_at: Date;
    @Column("int", { array: true })
    users: number[];
    @OneToMany(() => MessageEntity, (message) => message.chat)
    message: MessageEntity[];
}
