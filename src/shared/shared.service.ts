import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserEntity } from "../database/entities/user.entity";
import { Repository } from "typeorm";
import { ContactEntity } from "../database/entities/contact.entity";
import { ChatsEntity } from "../database/entities/chats.entity";

@Injectable()
export class SharedService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    @InjectRepository(ContactEntity)
    private contactsRepository: Repository<ContactEntity>,
    @InjectRepository(ChatsEntity)
    private chatsRepository: Repository<ChatsEntity>
  ) {}
  async getUser(id: number) {
    return await this.usersRepository
      .createQueryBuilder("users")
      .where("users.id = :id", { id: Number(id) })
      .getOne();
  }
  async getUserWithContactName(ownerId: number, userPhone: string) {
    const user = await this.usersRepository
      .createQueryBuilder("users")
      .where("users.id = :id", { id: Number(ownerId) })
      .getOne();
    const contact = await this.getContact(ownerId, userPhone);
    user.contactName = contact.name;
    return user;
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
  async getChatWithChatUsers(id: number) {
    const chat = await this.chatsRepository
      .createQueryBuilder("chat")
      .where("chat.id = :id", { id: Number(id) })
      .getOne();
    const chatUsers = await this.getChatUsers(chat.users);
    chat.chatUsers = chatUsers;
    return chat;
  }
  async getChatUsers(arr: number[]) {
    const users = [];
    for (let id of arr) {
      users.push(await this.getUser(id));
    }
    return users;
  }
}
