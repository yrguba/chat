import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
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

    let newContact = {...contact, owner: id};

    if (user && !contact) {
      const updatedUser = Object.assign(user, {});
      newContact = {...contactData, user: updatedUser, owner: id};

      updatedUser.contact.push(newContact);
      await this.usersRepository.save(updatedUser);
    }

    await this.contactsRepository.save(newContact);

    return {
      status: 200,
      data: {
        data: newContact
      }
    }
  }
}

