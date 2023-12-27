import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppEntity } from "../database/entities/app.entity";
import {
  editFileName,
  getFileInfo,
  getPathToFile,
  desktopReleaseTypeCheck,
} from "../utils/file-upload.utils";
import * as fs from "fs";
import * as path from "path";
import { successResponse } from "../utils/response";
import { json } from "express";

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
      console.log("serverPathToFile", serverPathToFile);
      const fileName = editFileName(null, file, () => "");
      if (!fs.existsSync(serverPathToFile)) {
        fs.mkdirSync(serverPathToFile, { recursive: true });
      }
      fs.writeFileSync(path.resolve(serverPathToFile, fileName), file.buffer);
      return `${clientPatchToFile}/${fileName}`;
    } catch (e) {
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
      const updFiles = files.map((file) => getFileInfo(file));
      return successResponse({ files: updFiles });
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

  async uploadTauriReleaseWindows(file, body) {
    const desktopReleasesDir = path.resolve("storage", "desktop_releases");
    if (!fs.existsSync(desktopReleasesDir)) {
      fs.mkdirSync(desktopReleasesDir, { recursive: true });
    }
    try {
      fs.writeFileSync(
        path.resolve(desktopReleasesDir, "win_data.json"),
        JSON.stringify(body)
      );
      return 200;
    } catch (e) {
      return 415;
    }
  }

  async uploadTauriReleaseMac(file, body) {
    const desktopReleasesDir = path.resolve("storage", "desktop_releases");
    if (!fs.existsSync(desktopReleasesDir)) {
      fs.mkdirSync(desktopReleasesDir, { recursive: true });
    }
    try {
      fs.writeFileSync(
        path.resolve(desktopReleasesDir, "mac_data.json"),
        JSON.stringify(body)
      );
      return 200;
    } catch (e) {
      return 415;
    }
  }

  async uploadPortableVersion() {
    return 200;
  }

  async getLatestDesktopRelease(params, req) {
    const desktopReleasesDir = path.resolve("storage", "desktop_releases");
    try {
      if (!fs.existsSync(desktopReleasesDir)) throw Error;

      const mac_data = fs.readFileSync(
        path.resolve(desktopReleasesDir, "win_data.json"),
        { encoding: "utf8" }
      );

      const win_data = fs.readFileSync(
        path.resolve(desktopReleasesDir, "mac_data.json"),
        { encoding: "utf8" }
      );

      const win_json = JSON.parse(win_data);
      const mac_json = JSON.parse(mac_data);
      console.log(win_json, mac_json);
      if (win_json.version !== mac_json.version) throw Error;
      const host = "https://dev.chat.softworks.ru/";

      const data = {
        version: `v${win_json.version}`,
        notes: "update",
        pub_date: "",
        platforms: {
          "darwin-x86_64": {
            signature: mac_json.signature,
            url: `${host}files/mac_app.tar.gz`,
          },
          "darwin-aarch64": {
            signature: mac_json.signature,
            url: `${host}files/mac_app.tar.gz`,
          },
          "windows-x86_64": {
            signature: win_json.signature,
            url: `${host}files/win_app.msi.zip`,
          },
        },
      };
      return { status: 200, data: data };
    } catch (e) {
      return { status: 204, data: {} };
    }
  }

  async getPortableVersion() {
    return {
      status: 200,
      data: {
        url: `/files/confee_portable.exe`,
      },
    };
  }

  async deleteDesktopRelease() {
    const desktopReleasesDir = path.join("storage", "desktop_releases");
    fs.rmSync(desktopReleasesDir, { recursive: true, force: true });
    return { status: 200 };
  }
}
