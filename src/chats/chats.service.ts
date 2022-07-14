import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {ChatsEntity} from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";
import {ChatDTO} from "./dto/chat.dto";
import {MessageDTO} from "./dto/message.dto";

@Injectable()
export class ChatsService {
    constructor(
        @InjectRepository(ChatsEntity)
        private chatsRepository: Repository<ChatsEntity>,
        @InjectRepository(MessageEntity)
        private messageRepository: Repository<MessageEntity>
    ) {}

    async createChat(data: ChatDTO): Promise<ChatsEntity> {
        return await this.chatsRepository.save(data);
    }

    async getChat(chat_id: number): Promise<ChatsEntity> {
        return await this.chatsRepository.createQueryBuilder('chat')
            .leftJoinAndSelect('chat.message', 'message')
            .orderBy('message.created_at', 'DESC')
            .where('chat.id = :id', { id: chat_id })
            .getOne();
    }

    async getChats(user_id: number): Promise<ChatsEntity[]> {
        return await this.chatsRepository.createQueryBuilder('chats')
            .leftJoinAndSelect('chats.message', 'message')
            .orderBy('message.created_at', 'DESC')
            .limit(1)
            .where('chats.users @> :users', {users: [user_id]})
            .getMany();
    }

    async addUserToChat(user_id: number, chat_id: number): Promise<ChatsEntity> {
        const chat = await this.chatsRepository.createQueryBuilder('chat')
            .where('chat.id = :id', { id: chat_id })
            .getOne();

        const updated = Object.assign(chat, {});

        if (chat) {
            updated.users.push(user_id)
        }

        return await this.chatsRepository.save(updated);
    }

    async createMessage(chat_id: number, user_id: number, data:any): Promise<any> {
        data.initiator_id = Number(user_id);
        const message = await this.messageRepository.save(data);

        const chat = await this.chatsRepository.findOne({
            where: { id: chat_id },
            relations: ['message'],
        });
        chat.message.push(message);
        await this.chatsRepository.save(chat);
        return {
            message: message,
            users: chat.users
        }
    }
}
