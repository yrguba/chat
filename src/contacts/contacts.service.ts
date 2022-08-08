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
      }
    });

    return {
      status: 200,
      data: {
        data: contacts
      }
    }
  }

  async saveContact(id: number, contact: any) {
    const user = await this.usersRepository.findOne({
      where: { phone: contact.phone },
      relations: ['contact'],
    });

    let newContact = {...contact, owner: id};

    if (user) {
      const updatedUser = Object.assign(user, {});
      newContact = {...contact, user: updatedUser, owner: id};
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

