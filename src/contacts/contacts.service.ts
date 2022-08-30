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
      relations: ['user'],
      where: { owner: Number(id) }
    });

    const allContacts = await this.contactsRepository.find({
      where: { owner: Number(id) }
    });

    console.log(contacts);
    console.log('-----');

    console.log(allContacts);

    contacts.map(contact => {
      if (contact.user) {
        delete contact['user'].code;
        delete contact['user'].player_id;
        delete contact['user'].socket_id;
        delete contact['user'].refresh_token;
      }
    });

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

    const contact = await this.contactsRepository.findOne({
      where: { phone: contactData.phone },
      relations: ['user'],
    });

    const newContact = {...contactData, user: user, owner: id};

    if (!contact || contact?.user?.id !== id) {
      if (user) {
        const updatedUser = Object.assign(user, {});
        updatedUser.contact.push(newContact);
        await this.usersRepository.save(updatedUser);
      }
    }

    if (newContact?.phone[0] === '+') await this.contactsRepository.save(newContact);

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
