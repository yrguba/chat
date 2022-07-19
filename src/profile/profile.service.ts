import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { ProfileDTO } from './dto/profile.dto';
import {validate} from "class-validator";
import {LoginDTO} from "../auth/dto/login.dto";

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}

  async getProfile(id: number) {
    const profile = await this.usersRepository
      .createQueryBuilder('users')
      .where('users.id = :id', { id: id })
      .getOne();
    if (!profile) {
      return { status: 404, data: {
        error: {
          code: 404,
          message: "Profile not found, check token"
        }
      }};
    }

    delete profile.code;
    delete profile.socket_id;
    return {
      status: 200,
      data: {
        data: profile
      }
    };
  }

  async updateProfile(id: any, profileData: ProfileDTO) {
    let keyError = '';
    const profile = await this.usersRepository
      .createQueryBuilder('users')
      .where('users.id = :id', { id: id })
      .getOne();
    if (profile) {
      Object.keys(profileData).map(key => {
        if (!(key in profile)) {
          keyError = key;
        }
      });

      if (keyError) {
        return { status: 422, data: {
          error: {
            code: 422,
            message: `field ${keyError} not found in profile`
          }
        }};
      } else {
        const updated = Object.assign(profile, profileData);
        delete updated.code;
        delete updated.socket_id;
        const updatedProfile = await this.usersRepository.save(updated);
        return {
          status: 200,
          data: {
            data: updatedProfile
          }
        };
      }
    } else {
      return { status: 404, data: {
        error: {
          code: 404,
          message: "Profile not found, check token"
        }
      }};
    }
  }
}
