import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ChatsEntity } from "../database/entities/chats.entity";
import { Repository } from "typeorm";
import { MessageEntity } from "../database/entities/message.entity";
import { UserEntity } from "../database/entities/user.entity";
import { ContactEntity } from "../database/entities/contact.entity";
import { SharedService } from "../shared/shared.service";
import { ChatsService } from "../chats/chats.service";
import { Server } from "socket.io";
import { getMessageSchema, getUserSchema } from "../utils/schema";
import * as admin from "firebase-admin";
import { DeleteMessageDto } from "./dto/deleteMessage.dto";
import { ReactionToMessageDTOBody } from "./dto/reactionToMessage.dto";
import { ReactionsEntity } from "../database/entities/reactions.entity";

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(ChatsEntity)
    private chatsRepository: Repository<ChatsEntity>,
    @InjectRepository(MessageEntity)
    private messageRepository: Repository<MessageEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(ContactEntity)
    private contactsRepository: Repository<ContactEntity>,
    @InjectRepository(ReactionsEntity)
    private reactionRepository: Repository<ReactionsEntity>,
    @Inject(forwardRef(() => ChatsService))
    private chatService: ChatsService,
    private sharedService: SharedService
  ) {}

  public socket: Server = null;

  async getMessage(id: number, relations?: object): Promise<any> {
    return await this.messageRepository.findOne({
      where: { id: id },
      relations: relations,
    });
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

  async getMessageWithUser(id: number): Promise<any> {
    return await this.messageRepository.findOne({
      where: { id: id },
      relations: ["user"],
    });
  }

  getFilterReactions(reactions, permitted) {
    const obj = {};
    Object.keys(reactions).forEach((i) => {
      if (permitted.includes(i)) {
        obj[i] = reactions[i];
      }
    });
    return obj;
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
          .leftJoinAndSelect("messages.reactions", "reactions")
          .orderBy("messages.created_at", "DESC")
          .where("messages.access @> :access", { access: [user_id] })
          .andWhere("messages.accessChats @> :accessChats", {
            accessChats: [chat_id],
          })
          .orWhere("messages.chat.id = :id", { id: chat_id })
          .getMany();
      }

      const { pending, total } = await this.sharedService.getCountMessages(
        user_id,
        chat.id
      );
      chat.pending_messages = pending;

      let splicedMessages = messages.splice(offset, options.limit);

      for (let message of splicedMessages) {
        if (message.user) {
          const contact = await this.sharedService.getContact(
            initiator.id,
            message.user.phone
          );
          message.user.contactName = contact?.name || "";
          message.user = getUserSchema(message.user);
        }
        message.message_status = this.sharedService.checkMessageStatus(
          user_id,
          message.users_have_read
        );
        message.reactions = this.getFilterReactions(
          message.reactions,
          chat.permittedReactions
        );

        message.users_have_read = this.sharedService.getFilteredUsersHeavyRead(
          message.users_have_read,
          message.initiator_id
        );

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

  async getSearchMessages(payload: {
    chat_id: number;
    limit: number;
    value: string;
  }): Promise<any> {
    let foundMessages = [];

    const getSortArr = (arr) => {
      return arr.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    };

    const chat = await this.chatsRepository.findOne({
      where: { id: Number(payload.chat_id) },
      relations: ["message"],
    });
    if (payload.value && chat.message.length) {
      let index = 0;
      let page = Math.ceil(chat.message.length / payload.limit);
      for (let msg of getSortArr(chat.message)) {
        if (index && index % payload.limit === 0) {
          page -= 1;
        }
        if (msg.text.toLowerCase().includes(payload.value.toLowerCase())) {
          const initiator = await this.userRepository.findOne({
            where: { id: msg.initiator_id },
          });
          foundMessages.push({
            message: {
              ...getMessageSchema(msg),
              user: getUserSchema(initiator),
            },
            page,
          });
        }
        index += 1;
      }
    } else {
      foundMessages = [];
    }
    return foundMessages;
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

    const reactions = await this.reactionRepository.save({});

    const message = await this.messageRepository.save({
      ...data,
      access: chat.users,
      accessChats: [chat_id],
      reply_message_id: replyMessageId,
      users_have_read: chat.listeners,
      reactions: reactions,
    });
    message.reactions = this.getFilterReactions(
      message.reactions,
      chat.permittedReactions
    );
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
          this.sharedService.getUser(user_id).then((user) => {
            if (user && user?.fb_tokens) {
              this.sharedService
                .getContact(user.id, initiator.phone)
                .then((contact) => {
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

    const findAuthorAndPushInArr = async (message) => {
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
              await findAuthorAndPushInArr(message);
            }
          } else {
            await findAuthorAndPushInArr(message);
          }
        }
      }

      const initiator = await this.userRepository.findOne({
        where: { id: user_id },
        relations: ["message"],
      });

      const text =
        messages.length > 1 ? "Пересланные сообщения" : "Пересланное сообщение";
      const haveRead = [...chat.listeners, user_id];

      const reactions = await this.reactionRepository.save({});

      const newMsg = await this.messageRepository.save({
        text: text,
        message_type: "text",
        initiator_id: user_id,
        forwarded_messages: messages.map((msg) => msg.id),
        users_have_read: haveRead,
        reactions: reactions,
      });
      chat.updated_at = new Date();
      chat.message.push(newMsg);
      initiator.message.push(newMsg);
      await this.userRepository.save(initiator);
      await this.chatsRepository.save(chat);

      if (chat) {
        const forwardMessage = {
          message_type: "system",
          text: text,
        };
        const userData = getUserSchema(initiator);
        await this.chatService.sendPushToChat(chat, initiator, forwardMessage);

        return {
          status: 200,
          data: {
            data: {
              message: {
                ...getMessageSchema(newMsg),
                reactions: this.getFilterReactions(
                  newMsg.reactions,
                  chat.permittedReactions
                ),
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
      await this.chatService.sendPushToChat(chat, initiator, message);

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
  async reactionToMessage(
    chat_id: number,
    messageId: number,
    userId: number,
    { reaction }: ReactionToMessageDTOBody
  ) {
    const chat = await this.chatService.getChatById(Number(chat_id));
    const message = await this.getMessage(Number(messageId), {
      reactions: true,
    });
    const { reactions } = message;
    const filtered = this.getFilterReactions(
      message.reactions,
      chat.permittedReactions
    );
    Object.keys(filtered).forEach((key) => {
      let found = false;
      filtered[key].forEach((i, index) => {
        if (i === userId) {
          if (key === reaction) found = true;
          filtered[key].splice(index, 1);
        }
      });
      if (!found && key === reaction) filtered[key].push(userId);
    });
    await this.reactionRepository.save({ ...reactions, ...filtered });
    return {
      users: chat.users,
      data: {
        chatId: Number(chat_id),
        messageId: message.id,
        reactions: filtered,
      },
    };
  }
}
