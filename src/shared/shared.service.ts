import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserEntity } from "../database/entities/user.entity";
import { Repository } from "typeorm";
import { ContactEntity } from "../database/entities/contact.entity";
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";
import { messageStatuses } from "../messages/constants";
import { getUserSchema } from "../utils/schema";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class SharedService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    @InjectRepository(ContactEntity)
    private contactsRepository: Repository<ContactEntity>,
    @InjectRepository(ChatsEntity)
    private chatsRepository: Repository<ChatsEntity>,
    @InjectRepository(MessageEntity)
    private messageRepository: Repository<MessageEntity>,
    private readonly jwtService: JwtService
  ) {}
  getUserId(client) {
    const jwt = client.handshake?.headers?.authorization?.replace(
      "Bearer ",
      ""
    );
    const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
    return json?.id;
  }

  async getUser(id: number) {
    return await this.usersRepository
      .createQueryBuilder("users")
      .where("users.id = :id", { id: Number(id) })
      .getOne();
  }
  async getUserWithContactName(ownerId: number, userId: number) {
    const user = await this.getUser(userId);
    if (user) {
      const contact = await this.getContact(ownerId, user?.phone);
      user.contactName = contact?.name || "";
      return user;
    }
    return null;
  }
  async getContact(ownerId: number, userPhone: string) {
    return await this.contactsRepository
      .createQueryBuilder("contact")
      .where("contact.owner = :id", { id: Number(ownerId) })
      .andWhere("contact.phone = :phone", { phone: userPhone })
      .getOne();
  }

  async getChat(id: number) {
    return await this.chatsRepository
      .createQueryBuilder("chat")
      .where("chat.id = :id", { id: Number(id) })
      .getOne();
  }

  async getChatWithChatUsers(
    chatId: number,
    ownerId?: number,
    userSchema = false
  ) {
    const chat = await this.getChat(chatId);
    if (chat) {
      chat.chatUsers = await this.getChatUsers(chat.users, ownerId, userSchema);
      return chat;
    }
    return null;
  }

  async getChatUsers(arr: number[], ownerId?: number, userSchema = false) {
    const users = [];
    for (let id of arr) {
      if (Number(id)) {
        if (ownerId) {
          const res = await this.getUserWithContactName(ownerId, id);
          if (userSchema) {
            res && users.push(getUserSchema(res));
          } else {
            res && users.push(res);
          }
        } else {
          const res = await this.getUser(id);
          if (userSchema) {
            res && users.push(res);
          } else {
            res && users.push(res);
          }
        }
      }
    }
    return users;
  }

  async getMessages(chatId: number) {
    return await this.messageRepository
      .createQueryBuilder("messages")
      .where("messages.chat.id = :id", { id: chatId })
      .andWhere("messages.message_status != :statusRead", {
        statusRead: messageStatuses.read,
      })
      .getMany();
  }

  async getMessage(chatId: number, messageId: number) {
    return await this.messageRepository
      .createQueryBuilder("chat")
      .where("chat.id = :id", { id: Number(chatId) })
      .where("id = :id", { id: Number(messageId) })
      .getOne();
  }

  getFilteredUsersHeavyRead = (users, user_id) => {
    if (users?.length) {
      return users.filter((i) => i !== user_id);
    }
    return [];
  };

  async saveMessage(message) {
    return await this.messageRepository.save(message);
  }

  async getCountMessages(
    userId: number,
    chatId: number
  ): Promise<{ pending: number; total: number }> {
    let pendingCounter = 0;
    const messages = await this.getMessages(chatId);
    messages.forEach((msg) => {
      if (msg.users_have_read) {
        if (!msg.users_have_read.includes(userId)) {
          pendingCounter += 1;
        }
      }
    });
    return {
      pending: pendingCounter,
      total: messages.length,
    };
  }

  checkMessageStatus(userId: number, usersHaveRead: number[]) {
    const check = usersHaveRead?.includes(userId);
    return check ? messageStatuses.read : messageStatuses.pending;
  }
}
