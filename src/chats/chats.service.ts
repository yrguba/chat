import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";
import { UserEntity } from "../database/entities/user.entity";
import { ContactEntity } from "../database/entities/contact.entity";
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
        @InjectRepository(ContactEntity)
        private contactsRepository: Repository<ContactEntity>,
    ) {}


    public socket: Server = null;

    async getChatName(user_id, chat) {
        let id;
        if (chat.users.length > 1) {
            id = chat?.users[0] === user_id ? chat?.users[1] : chat?.users[0];
        } else {
            id = chat?.users[0];
        }

        const user = await this.getUser(id);

        if (user) {
            const contact = await this.contactsRepository.createQueryBuilder('contact')
                .where('contact.owner = :id', { id: user_id })
                .andWhere('contact.phone = :phone', { phone: user.phone })
                .getOne();

            return {
                name: contact?.name || user.name || user.nickname  || user.phone,
                avatar: user.avatar,
            }
        }

        return {
            name: '',
            avatar: '',
        }
    }

    async getUser(id) {
        return await this.userRepository.createQueryBuilder('users')
            .where('users.id = :id', { id: Number(id) })
            .getOne();
    }

    async getContact(user) {
        return await this.contactsRepository.createQueryBuilder('contact')
            .where('contact.owner = :id', { id: user.id })
            .andWhere('contact.phone = :phone', { phone: user.phone })
            .getOne();
    }

    async createChat(user_id: number, data: ChatDTO) {
        let chat;
        // Получаем теущие чаты с текущими пользователями
        const currentChats = await this.chatsRepository.createQueryBuilder('chats')
          .where('chats.users @> :users', {users: data.users})
          .getMany();

        // Если чаты с данными пользователями существуют
        if (currentChats) {
            // Если чат групповой то создаем создаем новый
            if (data.is_group) {
                chat = await this.chatsRepository.save(data);
            } else {
                // Иначе
                const targetChat = currentChats.filter(chat => chat.users.sort().toString() === data.users.sort().toString());

                if (targetChat && targetChat.length === 0) {
                    chat = await this.chatsRepository.save(data);
                } else {

                }
            }

            if (chat?.users) {
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


                return {
                    status: 201,
                    data: {
                        data: {
                            ...chat,
                            chatUsers: users
                        }
                    }
                }
            } else {
                return {
                    status: 201,
                    data: {
                        data: {
                            ...chat,
                            chatUsers: []
                        }
                    }
                }
            }
        }
    }

    async getChat(user_id: number, chat_id: number) {
        const chat = await this.chatsRepository.createQueryBuilder('chat')
            .where('chat.id = :id', { id: chat_id })
            .getOne();

        if (chat) {
            const users = await this.userRepository.createQueryBuilder('users')
                .where("users.id IN (:...usersArray)", { usersArray: chat.users })
                .getMany();

            for (const user of users) {
                const contact = await this.contactsRepository.createQueryBuilder('contact')
                    .where('contact.owner = :id', { id: user_id })
                    .andWhere('contact.phone = :phone', { phone: user.phone })
                    .getOne();

                delete user['code'];
                delete user['player_id'];
                delete user['socket_id'];
                delete user['refresh_token'];
                delete user['fb_tokens'];

                user.contactName = contact?.name || '';
            }

            if (chat && !chat?.is_group) {
                const chatData = await this.getChatName(user_id, chat);
                chat.name = chatData?.name ? chatData?.name : chat.name;
                chat.avatar = chatData?.avatar ? chatData?.avatar : chat.name;

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
        } else {
            return { status: 404, data: {
                    error: {
                        code: 404,
                        message: "Chat with not found"
                    }
                }};
        }
    }

    async getChatWithUser(id: number, user_id: number) {
        const usersArray = [id, user_id];
        let chat;

        const currentChats = await this.chatsRepository.createQueryBuilder('chats')
            .where('chats.users @> :users', {users: usersArray})
            .getMany();

        if (currentChats) {
            const targetChat = currentChats.filter(chat => chat.users.sort().toString() === usersArray.sort().toString());
            chat = Array.isArray(targetChat) ? targetChat[0] : targetChat;
        }

        if (chat?.users) {
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

            return {
                status: 201,
                data: {
                    data: {
                        ...chat || null,
                        chatUsers: users
                    }
                }
            }
        } else {
            return {
                status: 201,
                data: {
                    data: {
                        ...chat || null,
                        chatUsers: []
                    }
                }
            }
        }
    }

    async updateChatName(user_id: number, chat_id: number, name: string) {
        const chat = await this.chatsRepository.createQueryBuilder('chat')
            .where('chat.id = :id', { id: chat_id })
            .getOne();
        const updatedChat = {...chat, name: name, updated_at: new Date()}
        await this.chatsRepository.save(updatedChat);

        return {
            status: 200,
            data: {
                data: updatedChat,
            }
        }
    }

    async updateChatAvatar(user_id: number, chat_id: number, avatar: string) {
        const chat = await this.chatsRepository.createQueryBuilder('chat')
            .where('chat.id = :id', { id: chat_id })
            .getOne();
        const updatedChat = {...chat, avatar: avatar, updated_at: new Date()}
        await this.chatsRepository.save(updatedChat);

        return {
            status: 200,
            data: {
                data: updatedChat,
            }
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
                    .leftJoinAndSelect("messages.user", "user")
                    .orderBy('messages.created_at', 'DESC')
                    .where('messages.chat.id = :id', { id: chat_id })
                    .getMany();
            }

            const splicedMessages = messages.splice(offset, options.limit);

            for (const message of splicedMessages) {
                if (message.user) {
                    delete message.user['code'];
                    delete message.user['player_id'];
                    delete message.user['socket_id'];
                    delete message.user['refresh_token'];
                    delete message.user['fb_tokens'];
                    message.user.contactName = await this.getContact(message.user);
                }
            }

            return {
                status: 200,
                data: {
                    data: splicedMessages,
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

    async deleteChat(id: number, chat_id: number): Promise<DeleteResult> {
        const chat = await this.chatsRepository.createQueryBuilder('chat')
            .where('chat.id = :id', { id: chat_id })
            .getOne();

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
                .where('chats.users @> :users', {users: [user_id]})
                //.andWhere("LOWER(chats.name) like LOWER(:name)", { name:`%${options.like.toLowerCase()}%` })
                .leftJoinAndSelect('chats.message', 'message', null,{'order': 'desc'})
                .orderBy('chats.updated_at', 'DESC')
                //.addOrderBy('message.created_at', 'DESC')
                .getMany();

            let filteredChats = chats;

            if (options.like) {
                filteredChats = chats.filter(chat => chat.name.toLowerCase().includes(options.like.toLowerCase()));
            }

            const splicedChats = filteredChats.splice(offset, options.limit);

            for (const chat of splicedChats) {
                if (user_id && !chat.is_group) {
                    const chatData = await this.getChatName(user_id, chat);
                    chat.name = chatData?.name ? chatData?.name : chat.name;
                    chat.avatar = chatData?.avatar ? chatData?.avatar : chat.name;
                    chat.message.splice(1, chat.message.length - 1);
                }
            }

            if (splicedChats) {
                return {
                    status: 200,
                    data: {
                        data: splicedChats,
                        page: options.page,
                        limit: options.limit,
                        total: count,
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

        if (!currentChatUsers.includes(user_id)) {
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

        if (currentChatUsers) {
            users.forEach(user => {
                if (!currentChatUsers.includes(user)) {
                    currentChatUsers.push(user);
                }
            });

            const updatedChat = {...chat, users: currentChatUsers, updated_at: new Date()}
            await this.chatsRepository.save(updatedChat);

            const chatUsers = await this.userRepository.createQueryBuilder('users')
                .where("users.id IN (:...usersArray)", { usersArray: currentChatUsers })
                .getMany();

            chatUsers.map(user => {
                delete user['code'];
                delete user['player_id'];
                delete user['socket_id'];
                delete user['refresh_token'];
                delete user['fb_tokens'];
                delete user['message'];
            });

            return {
                status: 200,
                data: {
                    data: {...chat, chatUsers: chatUsers, users: currentChatUsers},
                }
            };
        }
    }

    async removeUserFromChat(user_id: number, users: number[], chat_id: number) {
        const chat = await this.chatsRepository.createQueryBuilder('chat')
            .where('chat.id = :id', { id: chat_id })
            .getOne();

        let currentChatUsers = Array.from(chat.users);

        if (!currentChatUsers.includes(user_id)) {
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

        if (currentChatUsers) {
            const updatedUsers = currentChatUsers.filter(user => !users.includes(user));
            const updatedChat = {...chat, users: updatedUsers, updated_at: new Date()}
            await this.chatsRepository.save(updatedChat);

            const chatUsers = await this.userRepository.createQueryBuilder('users')
                .where("users.id IN (:...usersArray)", { usersArray: updatedChat.users })
                .getMany();

            chatUsers.map(user => {
                delete user['code'];
                delete user['player_id'];
                delete user['socket_id'];
                delete user['refresh_token'];
                delete user['fb_tokens'];
                delete user['message'];
            });

            return {
                status: 200,
                data: {
                    data: {...chat, chatUsers: chatUsers, users: updatedUsers},
                }
            };
        }
    }

    getMessageContent(message) {
        if (message.message_type === "image") {
            return "Изображение";
        } else if (message.message_type === "file") {
            return "Файл";
        } else {
            return message.text;
        }
    }

    async createMessage(chat_id: number, user_id: number, data:any): Promise<any> {
        data.initiator_id = Number(user_id);
        const message = await this.messageRepository.save(data);

        const chat = await this.chatsRepository.findOne({
            where: { id: chat_id },
            relations: ['message'],
        });

        const initiator = await this.userRepository.findOne({
            where: { id: user_id },
            relations: ['message'],
        });

        if (initiator) {
            initiator.message.push(message);
            await this.userRepository.save(initiator);
        }

        if (chat) {
            chat.message.push(message);
            chat.updated_at = new Date();
            await this.chatsRepository.save(chat);
            delete initiator['code'];
            delete initiator['player_id'];
            delete initiator['socket_id'];
            delete initiator['refresh_token'];
            delete initiator['fb_tokens'];
            delete initiator['message'];

            chat.users.forEach(user_id => {
                if (user_id !== initiator.id) {
                    this.getUser(user_id).then(user => {
                        if (user && user?.fb_tokens) {
                            this.getContact(user).then(contact => {
                                user?.fb_tokens.map(token => {
                                    admin.messaging().sendToDevice(token, {
                                        "notification": {
                                            "title": initiator.name,
                                            "body": message.text,
                                            "priority": "max"
                                        },
                                        "data": {
                                            "text": this.getMessageContent(message),
                                            "msg_type": message.message_type,
                                            "chat_id": String(chat.id),
                                            "chat_name": String(chat.name),
                                            "user_id": String(initiator.id),
                                            "user_name": initiator.name,
                                            "user_contact_name": contact?.name || "",
                                            "user_nickname": initiator.nickname,
                                            "user_avatar": initiator.avatar,
                                            "chat_avatar": chat.avatar,
                                            "is_group": chat.is_group ? "true" : "false"
                                        },
                                    });
                                });
                            });
                        }
                    });
                }
            });

            return {
                status: 201,
                data: {
                    message: {...message, user: initiator}
                },
                message: {...message, user: initiator},
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
    }

    async createPush(chat_id: number, user_id: number, data:any): Promise<any> {
        const user = await this.userRepository.createQueryBuilder('users')
            .where('users.id = :id', { id: Number(user_id) })
            .getOne();

        if (user) {
            if (user?.fb_tokens) {
                user?.fb_tokens.map(token => {
                    admin.messaging().sendToDevice(token, {
                        "notification": {
                            "title": "Test Push",
                            "body": "Body of test push"
                        },
                        data: {
                            text: "Test Push",
                            chat_id : "1",
                            body: "Body of test push"
                        }
                    });
                });
            }
        }

        return { status: 200, data: {
            error: {
                code: 200,
                message: "Test Push"
            }
        }};

    }
}

