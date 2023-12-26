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

  async uploadTauriRelease(files, body) {
    if (body.tag_name === "main") {
      body.tag_name = body.release_name.split(" ")[1];
    }
    const desktopReleasesDir = path.resolve("storage", "desktop_releases");
    if (!fs.existsSync(desktopReleasesDir)) {
      fs.mkdirSync(desktopReleasesDir, { recursive: true });
    }
    try {
      const currentVersionDir = path.resolve(desktopReleasesDir, body.tag_name);
      fs.mkdirSync(currentVersionDir, { recursive: true });
      fs.writeFileSync(
        path.resolve(currentVersionDir, "data.json"),
        JSON.stringify(body)
      );
      files.file.forEach((file) => {
        if (!desktopReleaseTypeCheck(file.originalname)) throw Error;
        fs.writeFileSync(
          path.resolve(currentVersionDir, file.originalname),
          Buffer.from(file.path)
        );
      });
      return 200;
    } catch (e) {
      return 415;
    }
  }

  async uploadPortableVersion() {
    return 200;
  }

  async getLastReleasesDir() {
    const desktopReleasesDir = path.join("storage", "desktop_releases");
    const pathTimestamps = [];

    fs.readdirSync(desktopReleasesDir).forEach((i) => {
      const sync = fs.statSync(path.join(desktopReleasesDir, i));
      pathTimestamps.push({ path: i, createdTimestamp: sync.birthtimeMs });
    });

    const sortReleases = pathTimestamps.sort((a, b) => {
      return b.createdTimestamp - a.createdTimestamp;
    });

    const lastVersionDir = path.join(
      desktopReleasesDir,
      sortReleases.shift().path
    );
    return lastVersionDir;
  }

  async getLatestDesktopRelease(params, req) {
    const lastReleaseDir = await this.getLastReleasesDir();
    try {
      if (!fs.existsSync(lastReleaseDir)) throw Error;

      const data_file = fs.readFileSync(
        path.resolve(lastReleaseDir, "data.json"),
        { encoding: "utf8" }
      );
      const json = JSON.parse(data_file);
      if (json.tag_name === params.version) throw Error;

      const data = {
        version: json.tag_name,
        notes: "update",
        pub_date: json.published_at,
        platforms: {
          "darwin-x86_64": {
            signature: json.tar_file_sig,
            url: json.tar_github_url,
          },
          "darwin-aarch64": {
            signature: json.tar_file_sig,
            url: json.tar_github_url,
          },
          "windows-x86_64": {
            signature: json.msi_file_sig,
            url: json.msi_github_url,
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
