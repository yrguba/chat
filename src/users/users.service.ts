import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {UserEntity} from '../database/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {
  }

  async getUsers(id: number) {
    const users = await this.usersRepository
      .createQueryBuilder('users')
      .where('users.id != :id', { id: Number(id) })
      .getMany();

    return {
      status: 200,
      data: {
        data: users
      }
    }
  }

  async getUser(id: number): Promise<UserEntity> {
    return await this.usersRepository
      .createQueryBuilder('users')
      .where('users.id = :id', {id: id})
      .getOne();
  }

  async updateUserSocket(id: number, socket_id: any) {
    const user = await this.usersRepository
      .createQueryBuilder('users')
      .where('users.id = :id', {id: id})
      .getOne();
    const updated = Object.assign(user, {socket_id: socket_id});
    return await this.usersRepository.save(updated);
  }
}
