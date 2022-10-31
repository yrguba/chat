import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserEntity } from "../database/entities/user.entity";
import { Repository } from "typeorm";
import { ContactEntity } from "../database/entities/contact.entity";

@Injectable()
export class SharedService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    @InjectRepository(ContactEntity)
    private contactsRepository: Repository<ContactEntity>
  ) {}
  async getUser(id) {
    return await this.usersRepository
      .createQueryBuilder("users")
      .where("users.id = :id", { id: Number(id) })
      .getOne();
  }
  async getContact(ownerId: number, userPhone: string) {
    return await this.contactsRepository
      .createQueryBuilder("contact")
      .where("contact.owner = :id", { id: ownerId })
      .andWhere("contact.phone = :phone", { phone: userPhone })
      .getOne();
  }
}
