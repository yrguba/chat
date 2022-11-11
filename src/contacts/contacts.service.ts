import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DeleteResult, Repository } from "typeorm";
import { ContactEntity } from "../database/entities/contact.entity";
import { UserEntity } from "../database/entities/user.entity";

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(ContactEntity)
    private contactsRepository: Repository<ContactEntity>,
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>
  ) {}

  async getContacts(id: number) {
    const contacts = await this.contactsRepository.find({
      where: { owner: Number(id) },
    });

    const phones = [];
    contacts.map((contact) => {
      phones.push(contact.phone);
    });

    if (phones.length) {
      const users = await this.usersRepository
        .createQueryBuilder("users")
        .where("users.phone IN (:...phonesArray)", { phonesArray: phones })
        .getMany();

      const currentContacts = Array.from(contacts);

      currentContacts.forEach((cont) => {
        const cUser = users.find((us) => us.phone === cont.phone);
        if (cUser) {
          delete cUser.code;
          delete cUser.player_id;
          delete cUser.socket_id;
          delete cUser.refresh_token;
          delete cUser.fb_tokens;
          cont.user = cUser;
        } else cont.user = null;
      });
    }

    return {
      status: 200,
      data: {
        data: contacts,
      },
    };
  }

  async getContact(contact_id: number) {
    const contact = await this.contactsRepository
      .createQueryBuilder("contact")
      .where("contact.id = :id", { id: contact_id })
      .getOne();

    return {
      status: 200,
      data: {
        data: contact,
      },
    };
  }

  async saveContact(id: number, newContacts: any) {
    const phones = [];
    const owner = await this.usersRepository.findOne({
      where: { id: id },
      relations: ["contact"],
    });

    const updatedUser = Object.assign(owner, {});

    for (const contact of newContacts) {
      if (!phones.includes(contact.phone)) {
        const newContact = { ...contact, owner: id };
        const savedContact = await this.contactsRepository.save(newContact);
        updatedUser.contact.push(savedContact);
        await this.usersRepository.save(updatedUser);
        phones.push(contact.phone);
      }
    }

    // if (newContact?.phone[0] === '+') {
    //   if (owner) {
    //     const updatedUser = Object.assign(owner, {});
    //     updatedUser.contact.push(newContact);
    //     await this.usersRepository.save(updatedUser);
    //     await this.contactsRepository.save(newContact);
    //   }
    // }

    return {
      status: 200,
      data: {
        data: newContacts,
      },
    };
  }

  async deleteContact(id: number): Promise<DeleteResult> {
    return await this.contactsRepository.delete(id);
  }
}
