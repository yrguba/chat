import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DeleteResult, Repository} from 'typeorm';
import { ContactEntity } from "../database/entities/contact.entity";
import { UserEntity } from "../database/entities/user.entity";

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

    contacts.map(contact => {
      this.usersRepository.findOne({
        where: { phone: contact.phone },
      }).then(user => {
          contact.user = user;
          delete contact['user'].code;
          delete contact['user'].player_id;
          delete contact['user'].socket_id;
          delete contact['user'].refresh_token;
          delete contact['user'].fb_tokens;
      })
    });

    console.log(contacts);

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

  async saveContact(id: number, contactData: any) {
    const user = await this.usersRepository.findOne({
      where: { phone: contactData.phone },
      relations: ['contact'],
    });

    const owner = await this.usersRepository.findOne({
      where: { id: id },
      relations: ['contact'],
    });

    const newContact = {...contactData, user_id: user.id, owner: id};

    if (newContact?.phone[0] === '+') {
      await this.contactsRepository.save(newContact);
      if (owner) {
        const updatedUser = Object.assign(owner, {});
        updatedUser.contact.push(newContact);
        await this.usersRepository.save(updatedUser);
      }
    }

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
