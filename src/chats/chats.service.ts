import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";
import { UserEntity } from "../database/entities/user.entity";
import { ChatDTO } from "./dto/chat.dto";
import * as admin from "firebase-admin";

const serviceAccount = require("../../fb.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

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
        const currentChats = await this.chatsRepository.createQueryBuilder('chats')
          .where('chats.users @> :users', {users: data.users})
          .getMany();

        if (currentChats) {
            const targetChat = currentChats.filter(chat => chat.users.toString() === data.users.toString());

            if (targetChat && targetChat.length === 0) {
                chat = await this.chatsRepository.save(data);
            } else chat = targetChat;
        }

        return {
            status: 201,
            data: {
                data: chat
            }
        }
    }

    async getChat(user_id: number, chat_id: number) {
        const chat = await this.chatsRepository.createQueryBuilder('chat')
            .where('chat.id = :id', { id: chat_id })
            .getOne();

        const users = await this.userRepository.createQueryBuilder('users')
            .where("users.id IN (:...usersArray)", { usersArray: chat.users })
            .getMany();

        users.forEach(user => {
            delete user['code'];
            delete user['player_id'];
            delete user['socket_id'];
            delete user['refresh_token'];
            delete user['fb_tokens'];
        });

        if (chat && !chat?.is_group) {
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

    async getMessages(user_id, chat_id, options) {
        let offset = 0;
        if (options.page > 1) offset = (options.page - 1) * options.limit;
        let messages = [];

        const chat = await this.chatsRepository.createQueryBuilder('chat')
            .where('chat.id = :id', { id: chat_id })
            .getOne();

        if (chat?.users.includes(user_id)) {
            const count = await this.messageRepository.createQueryBuilder('messages')
                .where('messages.chat.id = :id', { id: chat_id })
                .getCount();

            if (offset < count) {
                messages = await this.messageRepository.createQueryBuilder('messages')
                    .orderBy('messages.created_at', 'DESC')
                    .offset(offset)
                    .limit(options.limit)
                    .where('messages.chat.id = :id', { id: chat_id })
                    .getMany();
            }

            return {
                status: 200,
                data: {
                    data: messages,
                    page: options.page,
                    limit: options.limit,
                    total: count
                }
            }
        } else {
            return {
                status: 403,
                data: {
                    error: {
                        code: 403,
                        message: "You cant read this chat or this chat is not group"
                    }
                }
            }
        }
    }

    async deleteChat(chat_id: number): Promise<DeleteResult> {
        return await this.chatsRepository.delete(chat_id);
    }

    async getChats(user_id: number, options) {
        let offset = 0;
        if (options.page > 1) offset = (options.page - 1) * options.limit;

        const count = await this.chatsRepository.createQueryBuilder('chats')
            .where('chats.users @> :users', {users: [user_id]})
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
                if (!chat.is_group) {
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

    async addUserToChat(user_id: number, users: number[], chat_id: number) {
        const chat = await this.chatsRepository.createQueryBuilder('chat')
            .where('chat.id = :id', { id: chat_id })
            .getOne();

        let currentChatUsers = Array.from(chat.users);
        const updated = Object.assign(chat, {});

        if (chat && chat.users.includes(user_id)) {
            users.forEach((user) => {
                this.userRepository.createQueryBuilder('users')
                    .where('users.id = :id', { id: Number(user) })
                    .getOne().then(activeUser => {
                        if (activeUser && !chat.users.includes(user)) {
                            currentChatUsers.push(user);
                        }
                    });
            });
            updated.users = currentChatUsers;
            const chat = await this.chatsRepository.save(updated);

            return {
                status: 200,
                data: {
                    data: chat,
                }
            };
        } else {
            return {
                status: 403,
                data: {
                    error: {
                        code: 403,
                        message: "You cant add user to this chat"
                    }
                }
            }
        }
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
                delete user['code'];
                delete user['player_id'];
                delete user['socket_id'];
                delete user['refresh_token'];
                delete user['fb_tokens'];

                chat.users.forEach(user_id => {
                    this.getUser(user_id).then(user => {
                        if (user) {
                            if (user?.fb_tokens) {
                                user?.fb_tokens.map(token => {
                                    console.log(token);
                                    admin.messaging().sendToDevice(token, {
                                        "notification": {
                                            "title": user.name,
                                            "body": message.text
                                        },
                                    });
                                });
                            }
                        }
                    });
                });

                return {
                    status: 201,
                    data: {
                        message: {...message, initiator: user}
                    },
                    message: {...message, initiator: user},
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
