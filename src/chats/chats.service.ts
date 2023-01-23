import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { Server } from "socket.io";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DeleteResult, ArrayContainedBy } from "typeorm";
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";
import { UserEntity } from "../database/entities/user.entity";
import { ContactEntity } from "../database/entities/contact.entity";
import { ChatDTO } from "./dto/chat.dto";
import * as admin from "firebase-admin";
import { getMessageSchema, getUserSchema } from "../utils/schema";
import { messageStatuses } from "../messages/constants";
import { SharedService } from "../shared/shared.service";
import { MessagesService } from "../messages/messages.service";
import { reactions } from "./constants/reactions";
import { ReactionsEntity } from "../database/entities/reactions.entity";
import { badRequestResponse, successResponse } from "../utils/response";
import { FilePathsDirective, FileTypes } from "../files/constanst/paths";
import { FilesService } from "../files/files.service";

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
    @InjectRepository(ReactionsEntity)
    private reactionsRepository: Repository<ReactionsEntity>,
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService,
    private filesService: FilesService,
    private sharedService: SharedService
  ) {}

  public socket: Server = null;

  async getChatById(chat_id: number) {
    return await this.chatsRepository
      .createQueryBuilder("chat")
      .where("chat.id = :id", { id: chat_id })
      .getOne();
  }

  async getPrivateChat(user1: number, user2: number) {
    if (user1 && user2) {
      return await this.chatsRepository.findOne({
        where: {
          is_group: false,
          users: ArrayContainedBy([user1, user2]),
        },
      });
    }
  }

  async getChatName(user_id, chat) {
    let id;
    if (chat.users.length > 1) {
      id = chat?.users[0] === user_id ? chat?.users[1] : chat?.users[0];
    } else {
      id = chat?.users[0];
    }

    const user = await this.sharedService.getUser(id);

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
      targetMessage.message_status = this.sharedService.checkMessageStatus(
        user_id,
        targetMessage?.users_have_read
      );
      message[0].users_have_read = this.sharedService.getFilteredUsersHeavyRead(
        message[0].users_have_read,
        user_id
      );
      message[0].text = await this.messagesService.updTextSystemMessage(
        user_id,
        message[0]
      );
    }

    if (targetMessage && targetMessage.user) {
      const contact = await this.sharedService.getContact(
        initiator.id,
        targetMessage.user.phone
      );
      targetMessage.user.contactName = contact?.name || "";
      targetMessage.user = getUserSchema(targetMessage);
    }

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
        this.sharedService.getUser(user_id).then((user) => {
          if (user && user?.fb_tokens) {
            this.sharedService
              .getContact(user.id, initiator.phone)
              .then(async (contact) => {
                for (let token of user.fb_tokens) {
                  await admin.messaging().sendToDevice(
                    token,
                    {
                      notification: {
                        title:
                          message.message_type === "system"
                            ? chat.name
                            : contact?.name
                            ? contact?.name
                            : initiator.name,
                        body: String(
                          await this.messagesService.getMessageContent(
                            user_id,
                            message
                          )
                        ),
                        priority: "max",
                      },
                      data: {
                        text: String(
                          await this.messagesService.getMessageContent(
                            user_id,
                            message
                          )
                        ),
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
                    },
                    {
                      apns: {
                        payload: {
                          aps: {
                            "thread-id": String(chat.id),
                            sound: "default",
                          },
                        },
                      },
                    }
                  );
                }
              });
          }
        });
      }
    });
  }

  async createChat(user_id: number, data: ChatDTO, headers) {
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
      const savedChat = {
        ...data,
        permittedReactions: reactions.base,
      };
      // Если чат групповой то создаем создаем новый
      if (data.is_group) {
        console.log("Create Group Chat");
        chat = await this.chatsRepository.save(savedChat);
      } else {
        // Иначе
        let targetChat = currentChats.filter(
          (chat) =>
            chat.users.sort().toString() === data.users.sort().toString() &&
            !chat.is_group
        );
        console.log("Check private chats");
        if (targetChat && targetChat.length === 0) {
          console.log("Private chats not found");
          chat = await this.chatsRepository.save(savedChat);
        } else {
          if (Array.isArray(targetChat)) {
            if (targetChat.length === 1 && targetChat[0].is_group) {
              console.log("Create new private chat");
              chat = await this.chatsRepository.save(savedChat);
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

        if (chat && !chat.is_group) {
          const chatData = await this.getChatName(user_id, chat);
          chat.avatar = chatData.avatar;
        }

        if (isNewChat) {
          await this.messagesService
            .createMessage(
              chat.id,
              user_id,
              {
                text: `initiator:${user_id}/создал(а) чат/`,
                message_type: "system",
              },
              null,
              null,
              headers
            )
            .then(async (data) => {
              data.data.data.message.text =
                await this.messagesService.updTextSystemMessage(
                  user_id,
                  data.data.data.message
                );
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

  async setChatListeners(userId, { sub, unsub }) {
    if (sub) {
      const subChat = await this.sharedService.getChat(sub);
      const checkUser = subChat?.listeners.some((i) => i === userId);
      !checkUser && subChat?.listeners.push(userId);
      await this.chatsRepository.save(subChat);
    }
    if (unsub) {
      const unsubChat = await this.sharedService.getChat(unsub);
      if (unsubChat?.listeners) {
        unsubChat.listeners = unsubChat?.listeners.filter((i) => i !== userId);
        await this.chatsRepository.save(unsubChat);
      }
    }
  }

  async getChat(user_id: number, chat_id: number) {
    const chat = await this.sharedService.getChatWithChatUsers(
      chat_id,
      user_id,
      true
    );
    if (chat) {
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

      const { pending, total } = await this.sharedService.getCountMessages(
        user_id,
        chat.id
      );
      chat.pending_messages = pending;
      chat.totalMessages = total;

      if (chat && !chat?.is_group) {
        const chatData = await this.getChatName(user_id, chat);
        chat.name = chatData?.name ? chatData?.name : chat.name;
        chat.avatar = chatData?.avatar ? chatData?.avatar : chat.name;

        return {
          status: 200,
          data: {
            data: chat,
          },
        };
      } else if (chat) {
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

  async updateChatName(
    user_id: number,
    chat_id: number,
    name: string,
    headers
  ) {
    let message = [];
    const chat = await this.chatsRepository
      .createQueryBuilder("chat")
      .where("chat.id = :id", { id: chat_id })
      .getOne();
    const updatedChat = { ...chat, name: name, updated_at: new Date() };
    await this.messagesService
      .createMessage(
        chat_id,
        user_id,
        {
          text: `initiator:${user_id}/изменил(а) название чата/`,
          message_type: "system",
        },
        null,
        null,
        headers
      )
      .then((data) => {
        message = data;
      });
    await this.chatsRepository.update(chat_id, updatedChat);

    return {
      status: 200,
      socketData: {
        chat: {
          ...updatedChat,
          chatUsers: await this.sharedService.getChatUsers(updatedChat.users),
        },
        updatedValues: { name: name },
      },
      data: {
        data: updatedChat,
        message: message,
      },
    };
  }

  async updateChatAvatar(
    user_id: number,
    chat_id: number,
    avatar: string,
    headers
  ) {
    let message = [];
    const chat = await this.chatsRepository
      .createQueryBuilder("chat")
      .where("chat.id = :id", { id: chat_id })
      .getOne();
    await this.messagesService
      .createMessage(
        chat_id,
        user_id,
        {
          text: `initiator:${user_id}/изменил(а) аватар чата/`,
          message_type: "system",
        },
        null,
        null,
        headers
      )
      .then((data) => {
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

  async updateAvatar(
    userId: number,
    chatId: number,
    avatar: string,
    headers
  ): Promise<any> {
    const chat = await this.sharedService.getChatWithChatUsers(chatId);
    if (!chat) return badRequestResponse("нет такова чата");
    const checkUser = chat.users.includes(userId);
    if (!checkUser || !chat.is_group)
      return badRequestResponse("нет прав доступа");
    if (!chat.is_group) return badRequestResponse("нельзя поменять аватар");
    const message = await this.messagesService.createMessage(
      chatId,
      userId,
      {
        text: `initiator:${userId}/изменил(а) аватар чата/`,
        message_type: "system",
      },
      null,
      null,
      headers
    );
    chat.avatar = avatar;
    const updChat = await this.chatsRepository.save(chat);
    return successResponse(
      { chatId, avatar: updChat.avatar },
      { chat: updChat, updatedValues: { avatar } },
      message
    );
  }

  async getAvatars(chat_id: number, userId) {
    const chat = await this.getChatById(chat_id);
    if (!chat.is_group) {
      const id = chat.users.find((i) => i !== userId);
      return this.filesService.getFiles(FilePathsDirective.USER_AVATAR, id);
    }
    return this.filesService.getFiles(FilePathsDirective.CHAT_AVATAR, chat_id);
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
        const { pending, total } = await this.sharedService.getCountMessages(
          user_id,
          chat.id
        );

        const chatUsers = await this.sharedService.getChatUsers(
          chat.users,
          user_id,
          true
        );

        if (user_id && !chat.is_group) {
          const chatData = await this.getChatName(user_id, chat);
          chat.name = chatData?.name ? chatData?.name : chat.name;
          chat.avatar = chatData?.avatar ? chatData?.avatar : chat.avatar;
        }
        chat.message = await this.getLastMessageFromChat(chat.id, user_id);
        chat.pending_messages = pending;
        chat.totalMessages = total;
        chat.chatUsers = chatUsers;
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

  async addUserToChat(
    user_id: number,
    users: number[],
    chat_id: number,
    headers
  ) {
    let message = [];
    const chat = await this.chatsRepository
      .createQueryBuilder("chat")
      .where("chat.id = :id", { id: chat_id })
      .getOne();

    const initiator = await this.sharedService.getUser(user_id);

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
          const invitedUser = await this.sharedService.getUser(user);
          if (invitedUser && initiator) {
            await this.messagesService
              .createMessage(
                chat_id,
                user_id,
                {
                  text: `initiator:${initiator.id}/пригласил(а)/invited:${invitedUser.id}`,
                  message_type: "system",
                },
                null,
                null,
                headers
              )
              .then((data) => {
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
          socketData: {
            message: message,
            invited: users,
            chat: { ...chat, chatUsers: chatUsers },
            updatedValues: { chatUsers: usersData, users: currentChatUsers },
          },
          message: message,
        },
      };
    }
  }

  async exitFromChat(user_id: number, chat_id: number, headers) {
    const chat = await this.chatsRepository
      .createQueryBuilder("chat")
      .where("chat.id = :id", { id: chat_id })
      .getOne();

    if (!chat) {
      return {
        status: 404,
        data: {
          error: {
            code: 404,
            message: "Target chat not found",
          },
        },
      };
    }

    const currentChatUsers = Array.from(chat.users);

    if (currentChatUsers) {
      const updatedUsers = currentChatUsers.filter((user) => user !== user_id);
      const updatedChat = {
        ...chat,
        users: updatedUsers,
        updated_at: new Date(),
      };
      await this.chatsRepository.update(chat_id, updatedChat);

      const message = await this.messagesService.createMessage(
        chat_id,
        user_id,
        {
          text: `initiator:${user_id}/покинул(а) чат`,
          message_type: "system",
        },
        null,
        null,
        headers
      );

      if (message) {
        return {
          status: 200,
          data: {
            message: "Successfully left from chat",
          },
        };
      }
    }
  }

  async removeUserFromChat(
    user_id: number,
    users: number[],
    chat_id: number,
    headers
  ) {
    let message = [];
    const chat = await this.chatsRepository
      .createQueryBuilder("chat")
      .where("chat.id = :id", { id: chat_id })
      .getOne();

    const initiator = await this.sharedService.getUser(user_id);

    const currentChatUsers = Array.from(chat.users);

    if (!currentChatUsers.includes(user_id)) {
      return {
        status: 403,
        data: {
          error: {
            code: 403,
            message: "You cant remove user to this chat",
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
        const invitedUser = await this.sharedService.getUser(user);
        if (invitedUser && initiator) {
          await this.messagesService
            .createMessage(
              chat_id,
              user_id,
              {
                text: `initiator:${initiator.id}/удалил(а) из чата/invited:${invitedUser.id}`,
                message_type: "system",
              },
              null,
              null,
              headers
            )
            .then((data) => {
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
          socketData: {
            chat: { ...chat, chatUsers: chatUsers },
            updatedValues: { chatUsers: usersData, users: updatedUsers },
          },
          message: message,
        },
      };
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

  async setReactionsInChat(chat_id, reactions) {
    const chat = await this.sharedService.getChatWithChatUsers(chat_id);
    chat.permittedReactions = reactions;
    const updChat = await this.chatsRepository.save(chat);
    return successResponse(
      { chatId: updChat.id, permittedReactions: updChat.permittedReactions },
      { chat: updChat, updatedValues: { permittedReactions: reactions } }
    );
  }

  async getAllReactions() {
    return successResponse(reactions.base);
  }

  async getFiles(chatId: number, userId: number, fileType) {
    const chat = await this.getChatById(chatId);
    if (!chat.users.includes(userId)) return badRequestResponse("нет доступа");
    if (!Object.values(FileTypes).includes(fileType)) {
      return badRequestResponse("неверный тип");
    }
    const pathDictionary = {
      [FileTypes.IMAGES]: FilePathsDirective.CHAT_MESSAGES_IMAGES,
      [FileTypes.AUDIOS]: FilePathsDirective.CHAT_MESSAGES_AUDIOS,
      [FileTypes.VIDEOS]: FilePathsDirective.CHAT_MESSAGES_VIDEOS,
      [FileTypes.VOICES]: FilePathsDirective.CHAT_MESSAGES_VOICES,
    };
    return this.filesService.getFiles(pathDictionary[fileType], chatId);
  }
}
