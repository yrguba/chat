import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "../database/entities/user.entity";
import { ProfileEmptyDTO } from "./dto/profile.empty.dto";
import { FilesService } from "../files/files.service";
import { usersFilesAccessVerify } from "../utils/file-upload.utils";
import { badRequestResponse, successResponse } from "../utils/response";

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private filesService: FilesService
  ) {}

  async getProfile(id: number) {
    const profile = await this.usersRepository
      .createQueryBuilder("users")
      .where("users.id = :id", { id: id })
      .getOne();
    if (!profile) {
      return {
        status: 404,
        data: {
          error: {
            code: 404,
            message: "Profile not found, check token",
          },
        },
      };
    }

    delete profile.code;
    delete profile.socket_id;
    delete profile.refresh_token;
    return {
      status: 200,
      data: {
        data: profile,
      },
    };
  }

  async updateProfile(id: any, profileData: ProfileEmptyDTO) {
    let keyError = "";
    const profile = await this.usersRepository
      .createQueryBuilder("users")
      .where("users.id = :id", { id: id })
      .getOne();
    if (profile) {
      Object.keys(profileData).map((key) => {
        if (!(key in profile)) {
          keyError = key;
        }
      });

      if (keyError) {
        return {
          status: 422,
          data: {
            error: {
              code: 422,
              message: `field ${keyError} not found in profile`,
            },
          },
        };
      } else {
        const updated = Object.assign(profile, profileData);
        delete updated.code;
        delete updated.socket_id;
        delete updated.refresh_token;
        const updatedProfile = await this.usersRepository.save(updated);
        return {
          status: 200,
          data: {
            data: updatedProfile,
          },
        };
      }
    } else {
      return {
        status: 404,
        data: {
          error: {
            code: 404,
            message: "Profile not found, check token",
          },
        },
      };
    }
  }

  async deleteAvatar(userId, avatar) {
    const isVerify = usersFilesAccessVerify(userId, avatar);
    if (isVerify) {
      const result = this.filesService.deleteAvatarFile(avatar);
      const updatedProfile = await this.updateProfile(userId, {
        avatar: result.newAvatar,
      } as ProfileEmptyDTO);

      return successResponse({
        profile: updatedProfile.data.data,
        updatedList: result.updatedList,
      });
    }
    return badRequestResponse("нет доступа");
  }
}
