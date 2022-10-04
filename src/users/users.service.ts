import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DeleteResult, Repository} from 'typeorm';
import {UserEntity} from '../database/entities/user.entity';
import {ContactEntity} from "../database/entities/contact.entity";
import {getUserSchema} from "../utils/schema";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    @InjectRepository(ContactEntity)
    private contactsRepository: Repository<ContactEntity>,
  ) {
  }

  async getContactName(user_id) {
    const user = await this.getUser(user_id);

    if (user) {
      const contact = await this.contactsRepository.createQueryBuilder('contact')
          .where('contact.owner = :id', { id: user_id })
          .andWhere('contact.phone = :phone', { phone: user.phone })
          .getOne();

      return contact?.name || '';
    }

    return '';
  }

  async getUsers(id: number) {
    const users = await this.usersRepository
      .createQueryBuilder('users')
      .where('users.id != :id', { id: Number(id) })
      .getMany();

    let usersData = [];

    for (let user of users) {
      user.contactName = await this.getContactName(user.id);
      usersData.push(getUserSchema(user));
    }

    return {
      status: 200,
      data: {
        data: usersData
      }
    }
  }

  async getUser(id: number): Promise<UserEntity> {
    return await this.usersRepository
      .createQueryBuilder('users')
      .where('users.id = :id', {id: id})
      .getOne();
  }

  async getUserWithContacts(id: number): Promise<UserEntity> {
    return await this.usersRepository.findOne({
      where: { id: id },
      relations: ['contact'],
    })
  };

  async deleteUser(user_id: number): Promise<DeleteResult> {
    return await this.usersRepository.delete(user_id);
  }

  async updateUserSocket(id: number, socket_id: any, is_online: boolean = false,) {
    const user = await this.usersRepository
      .createQueryBuilder('users')
      .where('users.id = :id', {id: id})
      .getOne();
    const updated = Object.assign(user, {socket_id: socket_id, is_online: is_online, last_active: new Date()});
    return await this.usersRepository.save(updated);
  }
}
