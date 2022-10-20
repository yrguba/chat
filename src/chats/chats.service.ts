import { Injectable } from "@nestjs/common";
import { Server } from "socket.io";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DeleteResult } from "typeorm";
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";
import { UserEntity } from "../database/entities/user.entity";
import { ContactEntity } from "../database/entities/contact.entity";
import { ChatDTO } from "./dto/chat.dto";
import * as admin from "firebase-admin";
import { getMessageSchema, getUserSchema } from "../utils/schema";
import { DeleteMessageDto } from "./dto/deleteMessage.dto";
import { messageStatuses } from "./constants";

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
    private contactsRepository: Repository<ContactEntity>
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
      const contact = await this.contactsRepository
        .createQueryBuilder("contact")
        .where("contact.owner = :id", { id: user_id })
        .andWhere("contact.phone = :phone", { phone: user.phone })
        .getOne();

      return {
        name: contact?.name || user.name || user.nickname || user.phone,
        avatar: user.avatar,
      };
    }

    return {
      name: "",
      avatar: "",
    };
  }

  async getUser(id) {
    return await this.userRepository
      .createQueryBuilder("users")
      .where("users.id = :id", { id: Number(id) })
      .getOne();
  }

  async getContact(initiator, user) {
    return await this.contactsRepository
      .createQueryBuilder("contact")
      .where("contact.owner = :id", { id: initiator.id })
      .andWhere("contact.phone = :phone", { phone: user.phone })
      .getOne();
  }

  async getLastMessageFromChat(chat_id, user_id) {
    const message = await this.messageRepository
      .createQueryBuilder("messages")
      .leftJoinAndSelect("messages.user", "user")
      .where("messages.chat.id = :id", { id: chat_id })
      .orderBy("messages.created_at", "DESC")
      .limit(1)
      .getMany();

    const initiator = await this.userRepository.findOne({
      where: { id: user_id },
      relations: ["message"],
    });

    let targetMessage: any = message[0];

    if (targetMessage) {
      targetMessage = getMessageSchema(targetMessage);
    }

    if (targetMessage && targetMessage.user) {
      const contact = await this.getContact(initiator, targetMessage.user);
      targetMessage.user.contactName = contact?.name || "";
      targetMessage.user = getUserSchema(targetMessage);
    }

    // if (targetMessage && targetMessage.author_id) {
    //   const author = await this.userRepository.findOne({
    //     where: { id: targetMessage.author_id },
    //   });
    //   targetMessage.author = getUserSchema(author);
    // }

    if (targetMessage && targetMessage?.reply_message_id) {
      const replyMessage = await this.messageRepository.findOne({
        where: { id: targetMessage.reply_message_id },
      });
      targetMessage.replyMessage = getMessageSchema(replyMessage);
    }

    if (message) {
      return message;
    } else return null;
  }

  async sendPushToChat(chat, initiator, message) {
    chat.users.forEach((user_id) => {
      if (user_id !== initiator.id) {
        this.getUser(user_id).then((user) => {
          if (user && user?.fb_tokens) {
            this.getContact(user, initiator).then((contact) => {
              user?.fb_tokens.map((token) => {
                admin.messaging().sendToDevice(token, {
                  notification: {
                    title:
                      message.message_type === "system"
                        ? chat.name
                        : contact?.name
                        ? contact?.name
                        : initiator.name,
                    body: String(this.getMessageContent(message)),
                    priority: "max",
                  },
                  data: {
                    text: String(this.getMessageContent(message)),
                    msg_type: String(message.message_type),
                    chat_id: String(chat.id),
                    chat_name: String(chat.name),
                    user_id: String(initiator.id),
                    user_name: String(initiator.name),
                    user_contact_name: String(contact?.name) || "",
                    user_nickname: String(initiator.nickname),
                    user_avatar: String(initiator.avatar) || "",
                    chat_avatar: String(chat.avatar),
                    is_group: chat.is_group ? "true" : "false",
                  },
                });
              });
            });
          }
        });
      }
    });
  }

  async createChat(user_id: number, data: ChatDTO) {
    let message = [];
    let chat;
    let isNewChat = true;
    // Получаем теущие чаты с текущими пользователями
    const currentChats = await this.chatsRepository
      .createQueryBuilder("chats")
      .where("chats.users @> :users", { users: data.users })
      .getMany();

    // Если чаты с данными пользователями существуют
    if (currentChats) {
      // Если чат групповой то создаем создаем новый
      if (data.is_group) {
        console.log("Create Group Chat");
        chat = await this.chatsRepository.save(data);
      } else {
        // Иначе
        let targetChat = currentChats.filter(
          (chat) =>
            chat.users.sort().toString() === data.users.sort().toString()
        );
        console.log("Check private chats");
        if (targetChat && targetChat.length === 0) {
          console.log("Private chats not found");
          chat = await this.chatsRepository.save(data);
        } else {
          if (Array.isArray(targetChat)) {
            if (targetChat.length === 1 && targetChat[0].is_group) {
              console.log("Create new private chat");
              chat = await this.chatsRepository.save(data);
            } else {
              targetChat = targetChat.filter((chat) => !chat.is_group);
              chat = targetChat[0];
            }
          } else {
            chat = targetChat;
          }
          isNewChat = false;
        }
      }

      if (chat?.users) {
        const users = await this.userRepository
          .createQueryBuilder("users")
          .where("users.id IN (:...usersArray)", { usersArray: chat.users })
          .getMany();

        const usersData = [];

        users.forEach((user) => {
          usersData.push(getUserSchema(user));
        });

        if (isNewChat) {
          await this.createMessage(chat.id, user_id, {
            text: "Создан новый чат",
            message_type: "system",
          }).then((data) => {
            message = data;
          });
        }

        return {
          status: 201,
          data: {
            data: {
              ...chat,
              chatUsers: usersData,
              message: message,
            },
          },
        };
      } else {
        return {
          status: 201,
          data: {
            data: {
              ...chat,
              chatUsers: [],
              message: message,
            },
          },
        };
      }
    }
  }

  async getChatById(chat_id: number) {
    return await this.chatsRepository
      .createQueryBuilder("chat")
      .where("chat.id = :id", { id: chat_id })
      .getOne();
  }

  async getChatUnreadMessages(initiator_id: number, chat_id: number) {
    return await this.messageRepository
      .createQueryBuilder("messages")
      .where("messages.chat.id = :id", { id: chat_id })
      .andWhere("messages.message_status != :statusRead", {
        statusRead: messageStatuses.read,
      })
      .andWhere("messages.initiator_id != :initiator_id", {
        initiator_id: initiator_id,
      })
      .getCount();
  }

  async getChat(user_id: number, chat_id: number) {
    const chat = await this.chatsRepository
      .createQueryBuilder("chat")
      .where("chat.id = :id", { id: chat_id })
      .getOne();

    if (chat) {
      const users = await this.userRepository
        .createQueryBuilder("users")
        .where("users.id IN (:...usersArray)", { usersArray: chat.users })
        .getMany();

      const usersData = [];

      chat.pending_messages = await this.messageRepository
        .createQueryBuilder("messages")
        .where("messages.chat.id = :id", { id: chat.id })
        .andWhere("messages.message_status != :statusRead", {
          statusRead: messageStatuses.read,
        })
        .andWhere("messages.initiator_id != :initiator_id", {
          initiator_id: user_id,
        })
        .getCount();

      for (const user of users) {
        const contact = await this.contactsRepository
          .createQueryBuilder("contact")
          .where("contact.owner = :id", { id: user_id })
          .andWhere("contact.phone = :phone", { phone: user.phone })
          .getOne();

        user.contactName = contact?.name || "";
        usersData.push(getUserSchema(user));
      }

      if (chat && !chat?.is_group) {
        const chatData = await this.getChatName(user_id, chat);
        chat.name = chatData?.name ? chatData?.name : chat.name;
        chat.avatar = chatData?.avatar ? chatData?.avatar : chat.name;

        if (users) chat.chatUsers = usersData;

        return {
          status: 200,
          data: {
            data: chat,
          },
        };
      } else if (chat) {
        if (users) chat.chatUsers = usersData;
        return {
          status: 200,
          data: {
            data: chat,
          },
        };
      } else {
        return {
          status: 404,
          data: {
            error: {
              code: 404,
              message: "Chat with not found",
            },
          },
        };
      }
    } else {
      return {
        status: 404,
        data: {
          error: {
            code: 404,
            message: "Chat with not found",
          },
        },
      };
    }
  }

  async getChatWithUser(id: number, user_id: number) {
    const usersArray = [id, user_id];
    let chat;

    const currentChats = await this.chatsRepository
      .createQueryBuilder("chats")
      .where("chats.users @> :users", { users: usersArray })
      .getMany();

    if (currentChats) {
      const targetChat = currentChats.filter(
        (chat) => chat.users.sort().toString() === usersArray.sort().toString()
      );
      chat = Array.isArray(targetChat) ? targetChat[0] : targetChat;
    }

    if (chat?.users) {
      const users = await this.userRepository
        .createQueryBuilder("users")
        .where("users.id IN (:...usersArray)", { usersArray: chat.users })
        .getMany();

      const usersData = [];

      users.forEach((user) => {
        usersData.push(getUserSchema(user));
      });

      return {
        status: 201,
        data: {
          data: {
            ...(chat || null),
            chatUsers: usersData,
          },
        },
      };
    } else {
      return {
        status: 201,
        data: {
          data: {
            ...(chat || null),
            chatUsers: [],
          },
        },
      };
    }
  }

  async updateChatName(user_id: number, chat_id: number, name: string) {
    let message = [];
    const chat = await this.chatsRepository
      .createQueryBuilder("chat")
      .where("chat.id = :id", { id: chat_id })
      .getOne();
    const updatedChat = { ...chat, name: name, updated_at: new Date() };
    await this.createMessage(chat_id, user_id, {
      text: "Имя чата обновлено",
      message_type: "system",
    }).then((data) => {
      message = data;
    });
    await this.chatsRepository.update(chat_id, updatedChat);

    return {
      status: 200,
      data: {
        data: updatedChat,
        message: message,
      },
    };
  }

  async updateChatAvatar(user_id: number, chat_id: number, avatar: string) {
    let message = [];
    const chat = await this.chatsRepository
      .createQueryBuilder("chat")
      .where("chat.id = :id", { id: chat_id })
      .getOne();
    await this.createMessage(chat_id, user_id, {
      text: "У чата поменялся аватар",
      message_type: "system",
    }).then((data) => {
      message = data;
    });
    const updatedChat = { ...chat, avatar: avatar, updated_at: new Date() };
    await this.chatsRepository.update(chat_id, updatedChat);

    return {
      status: 200,
      data: {
        data: updatedChat,
        message: message,
      },
    };
  }

  async getMessages(user_id, chat_id, options) {
    let offset = 0;
    if (options.page > 1) offset = (options.page - 1) * options.limit;
    let messages = [];

    const chat = await this.chatsRepository
      .createQueryBuilder("chat")
      .where("chat.id = :id", { id: chat_id })
      .getOne();

    const initiator = await this.userRepository.findOne({
      where: { id: user_id },
      relations: ["message"],
    });

    if (chat?.users.includes(user_id)) {
      const count = await this.messageRepository
        .createQueryBuilder("messages")
        //
        .where("messages.access @> :access", { access: [user_id] })
        .andWhere("messages.accessChats @> :accessChats", {
          accessChats: [chat_id],
        })
        .orWhere("messages.chat.id = :id", { id: chat_id })
        .getCount();

      if (offset < count) {
        messages = await this.messageRepository
          .createQueryBuilder("messages")
          .leftJoinAndSelect("messages.user", "user")
          .orderBy("messages.created_at", "DESC")
          .where("messages.access @> :access", { access: [user_id] })
          .andWhere("messages.accessChats @> :accessChats", {
            accessChats: [chat_id],
          })
          .orWhere("messages.chat.id = :id", { id: chat_id })
          .getMany();
      }

      let splicedMessages = messages.splice(offset, options.limit);

      for (let message of splicedMessages) {
        if (message.user) {
          const contact = await this.getContact(initiator, message.user);
          message.user.contactName = contact?.name || "";
          message.user = getUserSchema(message.user);
        }

        if (message.forwarded_messages?.length) {
          const messages = [];
          for (let msgId of message.forwarded_messages) {
            const foundMsg = await this.messageRepository.findOne({
              where: { id: msgId },
            });
            if (foundMsg) {
              const user = await this.userRepository.findOne({
                where: { id: foundMsg.initiator_id },
              });
              foundMsg.user = getUserSchema(user);
              messages.push(getMessageSchema(foundMsg));
            }
          }
          message.forwarded_messages = messages;
        }
        if (message.reply_message_id) {
          const replyMessage = await this.getMessageWithUser(
            message.reply_message_id
          );
          replyMessage.user = getUserSchema(replyMessage.user);
          message.replyMessage = getMessageSchema(replyMessage);
        }
      }

      splicedMessages = splicedMessages.map((message) =>
        getMessageSchema(message)
      );

      return {
        status: 200,
        data: {
          data: splicedMessages,
          page: options.page,
          limit: options.limit,
          total: count,
          chat: chat,
        },
        users: chat.users,
      };
    } else {
      return {
        status: 403,
        data: {
          error: {
            code: 403,
            message: "You cant read this chat or this chat is not group",
          },
        },
      };
    }
  }

  async getMessage(id: number): Promise<any> {
    return await this.messageRepository.findOne({
      where: { id: id },
    });
  }

  async getMessageWithUser(id: number): Promise<any> {
    return await this.messageRepository.findOne({
      where: { id: id },
      relations: ["user"],
    });
  }

  async deleteChat(id: number, chat_id: number): Promise<DeleteResult> {
    return await this.chatsRepository.delete(chat_id);
  }

  async getUserChats(user_id): Promise<any> {
    return await this.chatsRepository
      .createQueryBuilder("chats")
      .where("chats.users @> :users", { users: [user_id] })
      .getMany();
  }

  async getChats(user_id: number, options) {
    let offset = 0;
    if (options.page > 1) offset = (options.page - 1) * options.limit;

    const count = await this.chatsRepository
      .createQueryBuilder("chats")
      .where("chats.users @> :users", { users: [user_id] })
      .getCount();

    if (offset < count) {
      const chats = await this.chatsRepository
        .createQueryBuilder("chats")
        .where("chats.users @> :users", { users: [user_id] })
        //.andWhere("LOWER(chats.name) like LOWER(:name)", { name:`%${options.like.toLowerCase()}%` })
        //.leftJoinAndSelect('chats.message', 'message')
        .orderBy("chats.updated_at", "DESC")
        //.addOrderBy('chats.message.created_at', 'DESC')
        .getMany();

      let filteredChats = chats;

      if (options.like) {
        filteredChats = chats.filter((chat) =>
          chat.name.toLowerCase().includes(options.like.toLowerCase())
        );
      }

      const splicedChats = filteredChats.splice(offset, options.limit);

      for (const chat of splicedChats) {
        const countPendingMessages = await this.messageRepository
          .createQueryBuilder("messages")
          .where("messages.chat.id = :id", { id: chat.id })
          .andWhere("messages.message_status != :statusRead", {
            statusRead: messageStatuses.read,
          })
          .andWhere("messages.initiator_id != :initiator_id", {
            initiator_id: user_id,
          })
          .getCount();

        if (user_id && !chat.is_group) {
          const chatData = await this.getChatName(user_id, chat);
          chat.name = chatData?.name ? chatData?.name : chat.name;
          chat.avatar = chatData?.avatar ? chatData?.avatar : chat.avatar;
        }
        chat.message = await this.getLastMessageFromChat(chat.id, user_id);
        chat.pending_messages = countPendingMessages;
      }

      if (splicedChats) {
        return {
          status: 200,
          data: {
            data: splicedChats,
            page: options.page,
            limit: options.limit,
            total: count,
          },
        };
      }
    } else {
      return {
        status: 200,
        data: {
          data: [],
          page: options.page,
          limit: options.limit,
          total: count,
        },
      };
    }
  }

  getUserName(user) {
    if (user.contactName) {
      return user.contactName;
    } else {
      return user.name || user.nickname || user.phone;
    }
  }

  async addUserToChat(user_id: number, users: number[], chat_id: number) {
    let message = [];
    const chat = await this.chatsRepository
      .createQueryBuilder("chat")
      .where("chat.id = :id", { id: chat_id })
      .getOne();

    const initiator = await this.getUser(user_id);

    const currentChatUsers = Array.from(chat.users);

    if (!currentChatUsers.includes(user_id)) {
      return {
        status: 403,
        data: {
          error: {
            code: 403,
            message: "You cant add user to this chat",
          },
        },
      };
    }

    if (currentChatUsers) {
      for (const user of users) {
        if (!currentChatUsers.includes(user)) {
          const invitedUser = await this.getUser(user);
          if (invitedUser && initiator) {
            await this.createMessage(chat_id, user_id, {
              text: `${this.getUserName(
                initiator
              )} пригласил ${this.getUserName(invitedUser)}`,
              message_type: "system",
            }).then((data) => {
              message = data;
            });
          }
          currentChatUsers.push(user);
        }
      }

      const updatedChat = {
        ...chat,
        users: currentChatUsers,
        updated_at: new Date(),
      };
      await this.chatsRepository.update(chat_id, updatedChat);

      const chatUsers = await this.userRepository
        .createQueryBuilder("users")
        .where("users.id IN (:...usersArray)", { usersArray: currentChatUsers })
        .getMany();

      const usersData = [];

      chatUsers.map((user) => {
        usersData.push(getUserSchema(user));
      });

      return {
        status: 200,
        data: {
          data: {
            ...chat,
            chatUsers: usersData,
            users: currentChatUsers,
            ...message,
          },
          message: message,
        },
      };
    }
  }

  async removeUserFromChat(user_id: number, users: number[], chat_id: number) {
    let message = [];
    const chat = await this.chatsRepository
      .createQueryBuilder("chat")
      .where("chat.id = :id", { id: chat_id })
      .getOne();

    const initiator = await this.getUser(user_id);

    const currentChatUsers = Array.from(chat.users);

    if (!currentChatUsers.includes(user_id)) {
      return {
        status: 403,
        data: {
          error: {
            code: 403,
            message: "You cant add user to this chat",
          },
        },
      };
    }

    if (currentChatUsers) {
      const updatedUsers = currentChatUsers.filter(
        (user) => !users.includes(user)
      );
      const updatedChat = {
        ...chat,
        users: updatedUsers,
        updated_at: new Date(),
      };
      await this.chatsRepository.update(chat_id, updatedChat);

      for (const user of users) {
        const invitedUser = await this.getUser(user);
        if (invitedUser && initiator) {
          await this.createMessage(chat_id, user_id, {
            text: `${this.getUserName(
              initiator
            )} удалил из чата ${this.getUserName(invitedUser)}`,
            message_type: "system",
          }).then((data) => {
            message = data;
          });
        }
      }

      const chatUsers = await this.userRepository
        .createQueryBuilder("users")
        .where("users.id IN (:...usersArray)", {
          usersArray: updatedChat.users,
        })
        .getMany();

      const usersData = [];

      chatUsers.map((user) => {
        usersData.push(getUserSchema(user));
      });

      return {
        status: 200,
        data: {
          data: {
            ...chat,
            chatUsers: usersData,
            users: updatedUsers,
            ...message,
          },
          message: message,
        },
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

  async createMessage(
    chat_id: number,
    user_id: number,
    data: any,
    replyMessageId: any = null
  ): Promise<any> {
    data.initiator_id = Number(user_id);

    const chat = await this.chatsRepository.findOne({
      where: { id: chat_id },
      relations: ["message"],
    });

    const message = await this.messageRepository.save({
      ...data,
      access: chat.users,
      accessChats: [chat_id],
      reply_message_id: replyMessageId,
    });

    const initiator = await this.userRepository.findOne({
      where: { id: user_id },
      relations: ["message"],
    });

    if (initiator) {
      initiator.message.push(message);
      await this.userRepository.save(initiator);
    }

    let userData;

    if (chat) {
      chat.message.push(message);
      chat.updated_at = new Date();
      await this.chatsRepository.save(chat);
      userData = getUserSchema(initiator);

      chat.users.forEach((user_id) => {
        if (user_id !== initiator.id) {
          this.getUser(user_id).then((user) => {
            if (user && user?.fb_tokens) {
              this.getContact(user, initiator).then((contact) => {
                user?.fb_tokens.map((token) => {
                  admin.messaging().sendToDevice(token, {
                    notification: {
                      title:
                        message.message_type === "system"
                          ? String(chat.name)
                          : contact?.name
                          ? String(contact?.name)
                          : String(initiator.name),
                      body: String(this.getMessageContent(message)),
                      priority: "max",
                    },
                    data: {
                      text: this.getMessageContent(message),
                      msg_type: message.message_type,
                      chat_id: String(chat.id),
                      chat_name: String(chat.name),
                      user_id: String(initiator.id),
                      user_name: String(initiator.name),
                      user_contact_name: contact?.name || "",
                      user_nickname: String(initiator.nickname),
                      user_avatar: String(initiator.avatar) || "",
                      chat_avatar: String(chat.avatar),
                      is_group: chat.is_group ? "true" : "false",
                    },
                  });
                });
              });
            }
          });
        }
      });

      let replyMessage = null;
      if (message.reply_message_id) {
        replyMessage = await this.getMessageWithUser(message.reply_message_id);
        replyMessage.user = getUserSchema(replyMessage.user);
      }

      return {
        status: 201,
        data: {
          data: {
            message: {
              ...getMessageSchema(message),
              user: userData,
              replyMessage: replyMessage
                ? getMessageSchema(replyMessage)
                : null,
            },
          },
        },
        message: {
          ...message,
          user: userData,
          replyMessage: replyMessage ? getMessageSchema(replyMessage) : null,
        },
        users: chat.users,
      };
    } else {
      return {
        status: 404,
        data: {
          error: {
            code: 404,
            message: "Chat not found",
          },
        },
      };
    }
  }

  async forwardMessage(
    chat_id: number,
    user_id: number,
    data: any
  ): Promise<any> {
    data.initiator_id = Number(user_id);
    const messages = [];

    const chat = await this.chatsRepository.findOne({
      where: { id: chat_id },
      relations: ["message"],
    });

    const fn = async (message) => {
      const author = await this.userRepository.findOne({
        where: { id: message.initiator_id },
        relations: ["message"],
      });
      const userSchema = getUserSchema(author);
      messages.push({ ...getMessageSchema(message), user: userSchema });
    };

    if (data.messages) {
      for (let messageId of data.messages) {
        const message = await this.messageRepository.findOne({
          where: { id: messageId },
        });
        if (chat && message) {
          if (message.forwarded_messages?.length) {
            for (let messageId of message.forwarded_messages) {
              const message = await this.messageRepository.findOne({
                where: { id: messageId },
              });
              await fn(message);
            }
          } else {
            await fn(message);
          }
        }
      }

      const initiator = await this.userRepository.findOne({
        where: { id: user_id },
        relations: ["message"],
      });

      const text =
        messages.length > 1 ? "Пересланные сообщения" : "Пересланное сообщение";

      const newMmg = await this.messageRepository.save({
        text: text,
        message_type: "text",
        initiator_id: user_id,
        forwarded_messages: messages.map((msg) => msg.id),
      });

      chat.updated_at = new Date();
      chat.message.push(newMmg);
      initiator.message.push(newMmg);
      await this.userRepository.save(initiator);
      await this.chatsRepository.save(chat);

      if (chat) {
        const forwardMessage = {
          message_type: "system",
          text: text,
        };
        const userData = getUserSchema(initiator);
        await this.sendPushToChat(chat, initiator, forwardMessage);

        return {
          status: 200,
          data: {
            data: {
              message: {
                ...getMessageSchema(newMmg),
                user: getUserSchema(initiator),
                forwarded_messages: messages,
              },
            },
          },
          message: { ...forwardMessage, user: userData },
          users: chat.users,
        };
      } else {
        return {
          status: 404,
          data: {
            error: {
              code: 404,
              message: "Chat not found",
            },
          },
        };
      }
    }
  }

  async replyMessage(
    chat_id: number,
    message_id: number,
    user_id: number,
    data: any
  ): Promise<any> {
    return await this.createMessage(chat_id, user_id, data, message_id);
  }

  async updateMessage(
    chat_id: number,
    message_id: number,
    user_id: number,
    data: any
  ): Promise<any> {
    data.initiator_id = Number(user_id);
    const message = await this.messageRepository.findOne({
      where: { id: message_id },
    });

    if (message.initiator_id !== user_id) {
      return {
        status: 403,
        data: {
          error: "Cant update another user message",
        },
      };
    }

    if (message.created_at) {
      if (
        (Date.now() - new Date(message.created_at).getTime()) / 1000 / 60 / 60 >
        24 + 3
      ) {
        return {
          status: 403,
          data: {
            error: "Message created date more then 24h",
          },
        };
      }
    }

    const updatedMessage = await this.messageRepository.save({
      ...message,
      text: data.text,
      is_edited: true,
    });

    const chat = await this.chatsRepository.findOne({
      where: { id: chat_id },
      relations: ["message"],
    });

    const initiator = await this.userRepository.findOne({
      where: { id: user_id },
      relations: ["message"],
    });

    let userData;

    if (chat) {
      chat.updated_at = new Date();
      userData = getUserSchema(initiator);
      await this.sendPushToChat(chat, initiator, message);

      return {
        status: 200,
        data: {
          data: {
            message: { ...getMessageSchema(updatedMessage), user: userData },
          },
        },
        message: { ...updatedMessage, user: userData },
        users: chat.users,
      };
    } else {
      return {
        status: 404,
        data: {
          error: {
            code: 404,
            message: "Chat not found",
          },
        },
      };
    }
  }

  async updateMessageStatus(
    message_id: number,
    status: string = messageStatuses.pending
  ): Promise<any> {
    const message = await this.messageRepository.findOne({
      where: { id: message_id },
    });

    if (message) {
      return await this.messageRepository.save({
        ...message,
        message_status: status,
      });
    }
  }

  async deleteMessage(id: number, chat_id: number, data: DeleteMessageDto) {
    const chat = await this.chatsRepository.findOne({
      where: { id: chat_id },
      relations: ["message"],
    });

    if (data.fromAll) {
      const deletedMessages = [];
      if (Array.isArray(data.messages)) {
        for (const message of data.messages) {
          const targetMessage = await this.getMessage(Number(message));
          deletedMessages.push(getMessageSchema(targetMessage));
          await this.messageRepository.delete(Number(message));
        }

        return {
          status: 200,
          data: {
            data: {
              messages: deletedMessages,
              chat: chat,
            },
          },
        };
      }
    } else {
      if (Array.isArray(data.messages)) {
        const updatedMessages = [];
        for (const message of data.messages) {
          const targetMessage = await this.messageRepository.findOne({
            where: { id: Number(message) },
          });

          const chatUsers = chat.users;
          const updatedAccessUsers = chatUsers.filter((user) => user !== id);

          const updatedMessage = await this.messageRepository.save({
            ...targetMessage,
            access: updatedAccessUsers,
          });
          updatedMessages.push(getMessageSchema(updatedMessage));
        }

        return {
          status: 200,
          data: {
            data: {
              messages: updatedMessages,
              chat: chat,
            },
          },
        };
      }
    }
  }

  async createPush(chat_id: number, user_id: number): Promise<any> {
    const user = await this.userRepository
      .createQueryBuilder("users")
      .where("users.id = :id", { id: Number(user_id) })
      .getOne();

    if (user) {
      if (user?.fb_tokens) {
        user?.fb_tokens.map((token) => {
          admin.messaging().sendToDevice(token, {
            notification: {
              title: "Test Push",
              body: "Body of test push",
            },
            data: {
              text: "Test Push",
              chat_id: "1",
              body: "Body of test push",
            },
          });
        });
      }
    }

    return {
      status: 200,
      data: {
        error: {
          code: 200,
          message: "Test Push",
        },
      },
    };
  }
}
