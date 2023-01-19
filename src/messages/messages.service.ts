import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from "@nestjs/common";
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
import { FilePathsDirective, FileTypes } from "../files/constanst/paths";
import { FilesService } from "../files/files.service";
import {
  audioTypeCheck,
  checkFileInDb,
  documentTypeCheck,
  getFileInfo,
  imageTypeCheck,
  videoTypeCheck,
} from "../utils/file-upload.utils";
import { NotificationsService } from "../notifications/notifications.service";
import { messageContentTypes } from "./constants";
import * as fs from "fs";
import { badRequestResponse } from "../utils/response";
import { UsersService } from "../users/users.service";

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
    private sharedService: SharedService,
    private fileService: FilesService,
    private notificationsService: NotificationsService,
    private usersService: UsersService
  ) {}

  public socket: Server = null;

  async getMessage(id: number, relations?: object): Promise<any> {
    return await this.messageRepository.findOne({
      where: { id: id },
      relations: relations,
    });
  }

  async getMessageContent(userId, message) {
    const dictionary = {
      images: "Изображение",
      // TODO убрать после перехода на v2
      image: "Изображение",
      videos: "Видео",
      audios: "Аудио",
      voices: "Голосовое сообщение",
      documents: "Документ",
      // TODO убрать после перехода на v2
      document: "Документ",
      system: await this.updTextSystemMessage(userId, message),
      text: message.text,
    };
    return dictionary[message.message_type];
  }

  async getMessageWithUser(id: number): Promise<any> {
    return await this.messageRepository.findOne({
      where: { id: id },
      relations: ["user"],
    });
  }

  getFilterReactions(reactions, permitted) {
    const obj = {};
    if (reactions && permitted) {
      Object.keys(reactions).forEach((i) => {
        if (permitted.includes(i)) {
          obj[i] = reactions[i];
        }
      });
    }
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

        if (message.message_type === "system") {
          message.text = await this.updTextSystemMessage(user_id, message);
        }

        if (message.forwarded_messages?.length) {
          message.forwarded_messages = await this.updForwardedMessages(
            user_id,
            message
          );
        }
        if (message.reply_message_id) {
          const replyMessage = await this.getMessageWithUser(
            message.reply_message_id
          );
          if (replyMessage) {
            if (replyMessage.forwarded_messages) {
              replyMessage.forwarded_messages = await this.updForwardedMessages(
                user_id,
                replyMessage
              );
            }
            replyMessage.user = getUserSchema(replyMessage.user);
            message.replyMessage = getMessageSchema({
              ...replyMessage,
              content: this.updMessageContent(replyMessage),
            });
            const contact = await this.sharedService.getContact(
              user_id,
              message.replyMessage.user.phone
            );
            message.replyMessage.user.contactName = contact?.name || "";
          }
        }
        message.content = this.updMessageContent(message);
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

  async updForwardedMessages(ownerId, message) {
    const messages = [];
    for (let msgId of message.forwarded_messages) {
      const foundMsg = await this.messageRepository.findOne({
        where: { id: msgId },
      });
      if (foundMsg) {
        const user = await this.sharedService.getUserWithContactName(
          ownerId,
          foundMsg.initiator_id
        );
        foundMsg.content = this.updMessageContent(foundMsg);
        foundMsg.user = getUserSchema(user);
        messages.push(getMessageSchema(foundMsg));
      }
    }
    return messages;
  }

  updMessageContent(message) {
    if (messageContentTypes.includes(message.message_type)) {
      if (message?.content?.length) {
        const content = [];
        message?.content.forEach((filePath) => {
          if (checkFileInDb(filePath)) {
            content.push(getFileInfo(filePath));
          }
        });
        return content;
      }
      if (checkFileInDb(message.text)) {
        return [getFileInfo(message.text)];
      }
      return [];
    }
    return [];
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

  saveMessageContent(chatId, files) {
    const arr = [];
    let type = "";
    Object.keys(files).forEach((key) => {
      type = key;
      const pathDictionary = {
        [FileTypes.IMAGES]: FilePathsDirective.CHAT_MESSAGES_IMAGES,
        [FileTypes.AUDIOS]: FilePathsDirective.CHAT_MESSAGES_AUDIOS,
        [FileTypes.VIDEOS]: FilePathsDirective.CHAT_MESSAGES_VIDEOS,
        [FileTypes.VOICES]: FilePathsDirective.CHAT_MESSAGES_VOICES,
        [FileTypes.DOCUMENTS]: FilePathsDirective.CHAT_MESSAGES_DOCUMENTS,
      };
      files[key].forEach((file) => {
        const typeCheckDictionary = {
          [FileTypes.IMAGES]: imageTypeCheck(file),
          [FileTypes.AUDIOS]: audioTypeCheck(file),
          [FileTypes.VIDEOS]: videoTypeCheck(file),
          [FileTypes.VOICES]: audioTypeCheck(file),
          [FileTypes.DOCUMENTS]: documentTypeCheck(file),
        };
        if (file && typeCheckDictionary[key]) {
          const fileName = this.fileService.createFile(
            file,
            pathDictionary[key],
            chatId
          );
          arr.push(fileName);
        } else {
          throw new HttpException(
            "формат файла не соответствует заявленному",
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      });
    });
    return { filesName: arr, type };
  }

  async createMessage(
    chat_id: number,
    user_id: number,
    data: any,
    replyMessageId: any = null,
    filesName?: string[]
  ): Promise<any> {
    data.initiator_id = Number(user_id);

    const chat = await this.chatsRepository.findOne({
      where: { id: chat_id },
      relations: ["message"],
    });

    if (!chat.users.find((i) => i === user_id)) {
      return badRequestResponse("you are not a member of the chat");
    }

    const reactions = await this.reactionRepository.save({});

    const message = await this.messageRepository.save({
      ...data,
      access: chat.users,
      accessChats: [chat_id],
      reply_message_id: replyMessageId,
      users_have_read: chat.listeners,
      reactions: reactions,
      content: filesName || [],
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

    message.content = this.updMessageContent(message);

    let userData;

    if (chat) {
      chat.message.push(message);
      chat.updated_at = new Date();
      await this.chatsRepository.save(chat);
      userData = getUserSchema(initiator);

      for (let user_id of chat.users) {
        if (user_id !== initiator.id && !chat.listeners.includes(user_id)) {
          const user = await this.usersService.getUser(user_id, {
            sessions: true,
          });
          const contact = await this.sharedService.getContact(
            user.id,
            initiator.phone
          );
          if (user?.sessions?.length) {
            for (let session of user.sessions) {
              if (session?.onesignal_player_id) {
                await this.notificationsService.newMessage(
                  session.onesignal_player_id,
                  chat,
                  {
                    ...message,
                    text: await this.getMessageContent(user_id, message),
                  },
                  initiator,
                  contact
                );
              }
              if (session?.firebase_token) {
                await admin.messaging().sendToDevice(session.firebase_token, {
                  notification: {
                    title: chat.is_group
                      ? String(chat.name)
                      : contact?.name
                      ? String(contact?.name)
                      : String(initiator.name),
                    // message.message_type === "system" ? String(chat.name) : contact?.name ? String(contact?.name) : String(initiator.name),
                    body: chat.is_group
                      ? `${
                          contact?.name
                            ? String(contact?.name)
                            : String(initiator.name)
                        }: ${await this.getMessageContent(user_id, message)}`
                      : await this.getMessageContent(user_id, message),
                    apns: JSON.stringify({
                      payload: {
                        aps: {
                          threadId: chat_id,
                          sound: "default",
                        },
                      },
                    }),
                    priority: "max",
                    sound: "default",
                    "thread-id": String(chat_id),
                    collapseKey: String(chat_id),
                    threadId: String(chat_id),
                  },
                  data: {
                    text: await this.getMessageContent(user_id, message),
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
              }
            }
          }
        }
      }
      let replyMessage = null;
      if (message.reply_message_id) {
        replyMessage = await this.getMessageWithUser(message.reply_message_id);
        replyMessage.user = getUserSchema(replyMessage.user);
        replyMessage.content = this.updMessageContent(replyMessage);
        if (replyMessage.forwarded_messages?.length) {
          replyMessage.forwarded_messages = await this.updForwardedMessages(
            user_id,
            replyMessage
          );
        }
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
        message.content = this.updMessageContent(message);
        if (chat && message) {
          if (message.forwarded_messages?.length) {
            for (let messageId of message.forwarded_messages) {
              const message = await this.messageRepository.findOne({
                where: { id: messageId },
              });
              message.content = this.updMessageContent(message);
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
          this.fileService.deleteFiles(targetMessage.content);
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

  async updTextSystemMessage(userId, message) {
    if (message?.text.includes("/")) {
      const { content, initiatorId, inviteId } =
        this.sharedService.parseMessageStatusText(message);
      if (content && initiatorId) {
        const isIAmInitiator =
          initiatorId && Number(userId) === Number(initiatorId);
        const isIAmInvited = inviteId && Number(userId) === Number(inviteId);
        let updMessage = [];
        if (!isIAmInitiator) {
          const initiator = await this.sharedService.getUserWithContactName(
            userId,
            initiatorId
          );
          updMessage[0] = initiator?.contactName || initiator.name;
        } else {
          updMessage[0] = "вы";
        }
        if (inviteId) {
          if (!isIAmInvited) {
            const invite = await this.sharedService.getUserWithContactName(
              userId,
              inviteId
            );
            updMessage[2] = invite?.contactName || invite.name;
          } else {
            updMessage[2] = "вас";
          }
        }
        updMessage[1] = content;
        if (isIAmInitiator) {
          const firstWord = updMessage[1].split(" ")[0];
          const words = updMessage[1].split(" ");
          words.splice(0, 1, `${firstWord}и`);
          updMessage[1] = words.join(" ");
        }
        return updMessage.join(" ");
      }
      return message.text;
    }
    return message.text;
  }
}
