import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DeleteResult, Repository} from 'typeorm';
import { ContactEntity } from "../database/entities/contact.entity";
import { UserEntity } from "../database/entities/user.entity";
import {log} from "util";

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(ContactEntity)
    private contactsRepository: Repository<ContactEntity>,
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>
  ) {
  }

  async getContacts(id: number) {
    const contacts = await this.contactsRepository.find({
      where: { owner: Number(id) }
    });

    const phones = [];
      contacts.map(contact => {
      phones.push(contact.phone);
    });
    const users = await this.usersRepository.createQueryBuilder('users')
        .where("users.phone IN (:...phonesArray)", { phonesArray: phones })
        .getMany();

    // const currentContacts = Array.from(contacts);
    //
    // currentContacts.forEach(cont => {
    //   const cUser = users.find(us => us.phone === cont.phone);
    //   if (cUser) {
    //     delete cUser.code;
    //     delete cUser.player_id;
    //     delete cUser.socket_id;
    //     delete cUser.refresh_token;
    //     delete cUser.fb_tokens;
    //     cont.user = cUser
    //   } else cont.user = null;
    // });
    //
    // // currentContacts.map((contact, index) => {
    // //   this.usersRepository.findOne({
    // //     where: { phone: contact.phone },
    // //   }).then(user => {
    // //     console.log(user);
    // //       contact.user = user;
    // //       if (user) {
    // //         delete contact['user'].code;
    // //         delete contact['user'].player_id;
    // //         delete contact['user'].socket_id;
    // //         delete contact['user'].refresh_token;
    // //         delete contact['user'].fb_tokens;
    // //       }
    // //   });
    // // });
    //
    // console.log(currentContacts);

      return {
        status: 200,
        data: {
          data: contacts
        }
      }
  }

  async getContact(contact_id: number) {
    const contact = await this.contactsRepository.createQueryBuilder('contact')
        .where('contact.id = :id', { id: contact_id })
        .getOne();

    return {
      status: 200,
      data: {
        data: contact
      }
    };
  }

  async saveContact(id: number, newContacts: any) {
    // const user = await this.usersRepository.findOne({
    //   where: { phone: contactData.phone },
    //   relations: ['contact'],
    // });

    const owner = await this.usersRepository.findOne({
      where: { id: id },
      relations: ['contact'],
    });

    const updatedUser = Object.assign(owner, {});
    updatedUser.contact.push(newContacts);
    await this.usersRepository.save(updatedUser);

    //const newContact = {...contactData, owner: id};

    for (const contact of newContacts) {
      const newContact = {...contact, owner: id};
      await this.contactsRepository.save(newContact);
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
        data: newContact
      }
    }
  }

  async deleteContact(id: number): Promise<DeleteResult> {
    return await this.contactsRepository.delete(id);
  }
}
