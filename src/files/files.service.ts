import { Injectable } from '@nestjs/common';
import  {InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppEntity } from "../database/entities/app.entity";

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(AppEntity)
    private appRepository: Repository<AppEntity>,
  ) {
  }

  async saveApp(version: number, path: string) {
    return await this.appRepository.save({
      version: version,
      path: path
    });
  }

  async getLastApp(currentVersion: number) {
    const apps = await this.appRepository
      .createQueryBuilder('apps')
      .orderBy('apps.version', 'DESC')
      .getMany();

    if (Number(currentVersion) === Number(apps[0].version)) {
      return {
        status: 200,
        data: {
          data: "Last version already installed"
        }
      }
    } else {
      return {
        status: 200,
        data: {
          data: apps[0]
        }
      }
    }
  }
}
