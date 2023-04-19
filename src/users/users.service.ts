import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { DeleteResult, Repository } from "typeorm";
import { UserEntity } from "../database/entities/user.entity";
import { ContactEntity } from "../database/entities/contact.entity";
import { getUserSchema } from "../utils/schema";
import { SharedService } from "../shared/shared.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    @InjectRepository(ContactEntity)
    private contactsRepository: Repository<ContactEntity>,
    private readonly jwtService: JwtService,
    private sharedService: SharedService
  ) {}

  async getUsers(id: number) {
    const users = await this.usersRepository
      .createQueryBuilder("users")
      .where("users.id != :id", { id: Number(id) })
      .getMany();

    const usersData = [];

    for (const user of users) {
      const contact = await this.sharedService.getContact(id, user.phone);
      user.contactName = contact?.name || "";
      usersData.push(getUserSchema(user));
    }

    return {
      status: 200,
      data: {
        data: usersData,
      },
    };
  }

  async getUser(id: number, relations?: object): Promise<any> {
    return await this.usersRepository.findOne({
      where: { id: id },
      relations: relations,
    });
  }

  async getUserByPhone(phone: string, relations?: object): Promise<any> {
    return await this.usersRepository.findOne({
      where: { phone: phone },
      relations: relations,
    });
  }

  async getUserWithContacts(id: number): Promise<UserEntity> {
    return await this.usersRepository.findOne({
      where: { id: id },
      relations: ["contact"],
    });
  }

  async deleteUser(user_id: number, initiator_id: number) {
    console.log(user_id === initiator_id);
    const user = await this.usersRepository
      .createQueryBuilder("users")
      .where("users.id = :id", { id: user_id })
      .getOne();

    if (!user) {
      return {
        status: 404,
        data: {
          data: {
            message: "User not found",
          },
        },
      };
    } else if (Number(user_id) !== Number(initiator_id)) {
      return {
        status: 403,
        data: {
          data: {
            message: "Operation forbidden",
          },
        },
      };
    } else {
      await this.usersRepository.delete(user_id);
      return {
        status: 200,
        data: {
          data: {
            message: "User delete successfully",
          },
        },
      };
    }
  }

  async updateUserSocket(id: number, socket_id: any, is_online = false) {
    const user = await this.usersRepository
      .createQueryBuilder("users")
      .where("users.id = :id", { id: id })
      .getOne();
    if (user) {
      const updated = Object.assign(user, {
        socket_id: socket_id,
        is_online: is_online,
        last_active: new Date(),
      });
      return await this.usersRepository.save(updated);
    }
  }

  async updateUserStatus(id: number, is_online = false) {
    const user = await this.usersRepository
      .createQueryBuilder("users")
      .where("users.id = :id", { id: id })
      .getOne();
    if (user) {
      const updated = Object.assign(user, {
        is_online: is_online,
        last_active: new Date(),
      });
      return await this.usersRepository.save(updated);
    }
  }

  async getUserIdFromToken(req): Promise<number> {
    if (req.headers && req.headers.authorization) {
      console.log('wdad')
      const jwt = req.headers.authorization.replace("Bearer ", "");
      const json = this.jwtService.decode(jwt, { json: true }) as {
        id: number;
      };

      return json.id;
    } else {
      return null;
    }
  }

  async getUserIdFromRefreshToken(token): Promise<number> {
    if (token) {
      const json = this.jwtService.decode(token, { json: true }) as {
        id: number;
      };

      return json.id;
    } else {
      return null;
    }
  }

  async setUserStatus(userId, is_online) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (user) {
      user.is_online = is_online;
      if (!is_online) user.last_active = new Date();
      return `user id:${user.id} ${is_online ? "connected" : "disconnected"}`;
    }
  }
}
