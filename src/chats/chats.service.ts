import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";
import { UserEntity } from "../database/entities/user.entity";
import { ChatDTO } from "./dto/chat.dto";
import * as admin from "firebase-admin";

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

    async getUser(id) {
        return await this.userRepository.createQueryBuilder('users')
            .where('users.id = :id', { id: Number(id) })
            .getOne();
    }

    async createChat(data: ChatDTO) {
        let chat;
        const currentChat = await this.chatsRepository.createQueryBuilder('chats')
          .where('chats.users @> :users', {users: data.users})
          .getOne();

        if (!currentChat) {
            chat = await this.chatsRepository.save(data);
        } else chat = currentChat;

        return {
            status: 201,
            data: {
                data: chat
            }
        }
    }

    async getChat(user_id: number, chat_id: number) {
        const chat = await this.chatsRepository.createQueryBuilder('chat')
            .leftJoinAndSelect('chat.message', 'message')
            .orderBy('message.created_at', 'DESC')
            .where('chat.id = :id', { id: chat_id })
            .getOne();

        const users = await this.userRepository.createQueryBuilder('users')
            .where("users.id IN (:...usersArray)", { usersArray: chat.users })
            .getMany();

        if (chat && chat?.users?.length < 3) {
            const id = chat?.users[0] === user_id ? chat?.users[1] : chat?.users[0];
            const user = await this.getUser(id);

            if (user) {
                chat.name = user.nickname || user.name || user.phone;
                chat.avatar = user.avatar;
            }

            if (users) chat.chatUsers = users;

            return {
                status: 200,
                data: {
                    data: chat
                }
            };
        } else if (chat) {
            if (users) chat.chatUsers = users;
            return {
                status: 200,
                data: {
                    data: chat
                }
            }
        } else {
            return { status: 404, data: {
                error: {
                    code: 404,
                    message: "Chat with not found"
                }
            }};
        }
    }

    async deleteChat(chat_id: number): Promise<DeleteResult> {
        return await this.chatsRepository.delete(chat_id);
    }

    async getChats(user_id: number, options) {
        let offset = 0;
        if (options.page > 1) offset = (options.page - 1) * options.limit;

        const count = await this.chatsRepository.createQueryBuilder('chats')
          .getCount();

        if (offset < count) {
            const chats = await this.chatsRepository.createQueryBuilder('chats')
              .leftJoinAndSelect('chats.message', 'message')
              .orderBy('message.created_at', 'DESC')
              .offset(offset)
              .limit(options.limit)
              .where('chats.users @> :users', {users: [user_id]})
              .getMany();

            for (const chat of chats) {
                if (chat.users.length < 3) {
                    const id = chat?.users[0] === user_id ? chat?.users[1] : chat?.users[0];
                    const user = await this.getUser(id);
                    if (user) {
                        chat.name = user.nickname || user.name || user.phone;
                        chat.avatar = user.avatar;
                    }
                }
                chat.message.splice(1, chat.message.length - 1);
            }

            if (chats) {
                return {
                    status: 200,
                    data: {
                        data: chats,
                        page: options.page,
                        limit: options.limit,
                        total: count
                    }
                };
            }
        } else {
            return {
                status: 200,
                data: {
                    data: [],
                    page: options.page,
                    limit: options.limit,
                    total: count
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

                chat.users.forEach(user_id => {
                    const groupUser: any = this.getUser(user_id);
                    if (user?.player_id) {
                        admin.messaging().sendToDevice(groupUser.player_id, {
                            "notification": {
                                "title": user.name,
                                "body": message.text
                            },
                        });
                    }
                });

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
