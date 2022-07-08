import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { ProfileDTO } from './dto/profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}

  async getProfile(id: number): Promise<UserEntity> {
    const profile = await this.usersRepository
      .createQueryBuilder('users')
      .where('users.id = :id', { id: id })
      .getOne();
    if (!profile) {
      return null;
    }

    delete profile.code;
    return profile;
  }

  async updateProfile(id: any, profileData: ProfileDTO): Promise<UserEntity> {
    const profile = await this.usersRepository
      .createQueryBuilder('users')
      .where('users.id = :id', { id: id })
      .getOne();
    const updated = Object.assign(profile, profileData);
    delete updated.code;
    return await this.usersRepository.save(updated);
  }
}
