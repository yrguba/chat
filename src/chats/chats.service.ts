import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";
import { UserEntity } from "../database/entities/user.entity";
import { ChatDTO } from "./dto/chat.dto";
import {MessageDTO} from "./dto/message.dto";

@Injectable()
export class ChatsService {
    constructor(
        @InjectRepository(ChatsEntity)
        private chatsRepository: Repository<ChatsEntity>,
        @InjectRepository(MessageEntity)
        private messageRepository: Repository<MessageEntity>,
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
    ) {}

    public socket: Server = null;

    async createChat(data: ChatDTO): Promise<ChatsEntity> {
        return await this.chatsRepository.save(data);
    }

    async getChat(chat_id: number) {
        const chat = await this.chatsRepository.createQueryBuilder('chat')
            .leftJoinAndSelect('chat.message', 'message')
            .orderBy('message.created_at', 'DESC')
            .where('chat.id = :id', { id: chat_id })
            .getOne();

        if (chat) {
            return {
                status: 200,
                data: {
                    data: chat
                }
            };
        } else {
            return { status: 404, data: {
                error: {
                    code: 404,
                    message: "Chat with not found"
                }
            }};
        }
    }

    async getChats(user_id: number) {
        const chats = await this.chatsRepository.createQueryBuilder('chats')
            .leftJoinAndSelect('chats.message', 'message')
            .orderBy('message.created_at', 'DESC')
            .where('chats.users @> :users', {users: [user_id]})
            .getMany();

        chats.map(chat => {
            chat.message.splice(1, chat.message.length - 1);
        });

        if (chats) {
            return {
                status: 200,
                data: {
                    data: chats
                }
            };
        }
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
        const user = await this.userRepository.createQueryBuilder('users')
            .where('users.id = :id', { id: Number(user_id) })
            .getOne();

        if (user) {
            data.initiator_id = Number(user_id);
            const message = await this.messageRepository.save(data);

            const chat = await this.chatsRepository.findOne({
                where: { id: chat_id },
                relations: ['message'],
            });

            if (chat) {
                chat.message.push(message);
                await this.chatsRepository.save(chat);
                message.initiator = user;
                return {
                    status: 201,
                    data: {
                        message: message
                    },
                    message: message,
                    users: chat.users,
                }
            } else {
                return { status: 404, data: {
                    error: {
                        code: 404,
                        message: "Chat not found"
                    }
                }};
            }
        } else {
            return { status: 400, data: {
                error: {
                    code: 400,
                    message: "Sender not found"
                }
            }};
        }
    }
}
