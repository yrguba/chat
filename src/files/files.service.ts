import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppEntity } from "../database/entities/app.entity";
import { editFileName, getPathToFile } from "../utils/file-upload.utils";
import * as fs from "fs";
import * as path from "path";
import { successResponse } from "../utils/response";
import {log} from "util";

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(AppEntity)
    private appRepository: Repository<AppEntity>
  ) {}

  async saveApp(version: number, path: string) {
    return await this.appRepository.save({
      version: version,
      path: path,
    });
  }

  async getLastApp(currentVersion: number) {
    const apps = await this.appRepository
      .createQueryBuilder("apps")
      .orderBy("apps.version", "DESC")
      .getMany();

    if (Number(currentVersion) === Number(apps[0].version)) {
      return {
        status: 200,
        data: {
          data: "Last version already installed",
        },
      };
    } else {
      return {
        status: 200,
        data: {
          data: apps[0],
        },
      };
    }
  }

  createFile(file, directive, id): string {
    try {
      const { clientPatchToFile, serverPathToFile } = getPathToFile(
        directive,
        id
      );
      const fileName = editFileName(null, file, () => "");
      if (!fs.existsSync(serverPathToFile)) {
        fs.mkdirSync(serverPathToFile, { recursive: true });
      }
      fs.writeFileSync(path.resolve(serverPathToFile, fileName), file.buffer);
      return `${clientPatchToFile}/${fileName}`;
    } catch (e) {
      console.log(e);
      throw new HttpException(
        "ошибка загрузки файла",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  getFiles(directive, id) {
    try {
      const { clientPatchToFile, serverPathToFile } = getPathToFile(
        directive,
        id
      );
      const files = [];
      if (fs.existsSync(serverPathToFile)) {
        fs.readdirSync(serverPathToFile).forEach((file) => {
          files.push(`${clientPatchToFile}/${file}`);
        });
      }
      return successResponse({ files });
    } catch (e) {
      throw new HttpException(
        "ошибка поиска файлов",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  deleteFiles(filesName) {
    try {
      filesName.forEach((fileName) => {
        const filePath = `.${fileName}`;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          return successResponse({});
        }
      });
    } catch (e) {
      throw new HttpException(
        "неудалось удалить файл",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  deleteAvatarFile(fileName) {
    try {
      const filePath = `.${fileName}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        const directive = filePath.split("/").slice(0, -1).join("/");
        const items = fs.readdirSync(directive);
        const getFilePath = (name) => {
          return `${directive}/${name}`.replace(/^\./, "");
        };
        return {
          newAvatar: items.length ? getFilePath(items[0]) : "",
          updatedList: items.map((item) => getFilePath(item)),
        };
      }
    } catch (e) {
      throw new HttpException(
        "неудалось удалить файл",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
