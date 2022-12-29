import { Injectable } from "@nestjs/common";
import { LoginDTO } from "./dto/login.dto";
import { validate } from "class-validator";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { UserEntity } from "../database/entities/user.entity";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import * as https from "https";
import * as argon2 from "argon2";

import {
  badRequestResponse,
  internalErrorResponse,
  successResponse,
  unAuthorizeResponse,
} from "../utils/response";
import { getIdentifier } from "../utils/sessions.utils";
import { UsersService } from "../users/users.service";
import { SessionEntity } from "../database/entities/session.entity";
import { getSessionSchema, getUserSchema } from "../utils/schema";

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UsersService,
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    @InjectRepository(SessionEntity)
    private sessionRepository: Repository<SessionEntity>
  ) {}

  async login(user: any): Promise<Record<string, any>> {
    let isValid = false;

    const userData = new LoginDTO();
    userData.phone = user.phone;
    userData.code = user.code;

    await validate(userData).then((errors) => {
      if (errors.length === 0) {
        isValid = true;
      }
    });

    if (isValid) {
      const userDetails = await this.usersRepository
        .createQueryBuilder("users")
        .where("users.phone = :phone", { phone: user.phone })
        .getOne();

      if (userDetails == null) {
        return unAuthorizeResponse();
      }

      const isValid = bcrypt.compareSync(user.code, userDetails.code);
      if (isValid) {
        delete userDetails.code;
        const refreshToken = this.jwtService.sign(
          {
            phone: user.phone,
            id: userDetails.id,
          },
          {
            secret: `${process.env.SECRET_REFRESH.replace(/\\\\n/gm, "\\n")}`,
            expiresIn: "7d",
          }
        );
        await this.updateRefreshToken(userDetails.id, refreshToken);
        return successResponse({
          access_token: this.jwtService.sign(
            {
              phone: user.phone,
              id: userDetails.id,
            },
            {
              secret: `${process.env.SECRET.replace(/\\\\n/gm, "\\n")}`,
              expiresIn: "15m",
            }
          ),
          ...userDetails,
          refresh_token: refreshToken,
        });
      } else {
        return unAuthorizeResponse();
      }
    } else {
      return badRequestResponse("Invalid fields");
    }
  }

  async loginV2(data, headers) {
    const sessionInfo = getIdentifier(headers);
    const user = await this.userService.getUserByPhone(data.phone, {
      sessions: true,
    });
    if (!user) return badRequestResponse("Invalid fields");
    const checkCode = bcrypt.compareSync(data.code, user.code);
    if (!checkCode) return unAuthorizeResponse();
    const tokens = await this.updCurrentSession(sessionInfo, user, "login");
    return successResponse({
      ...getUserSchema(user),
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
  }

  async logout(userId, headers) {
    const sessionInfo = getIdentifier(headers);
    const user = await this.userService.getUser(userId, {
      sessions: true,
    });
    await this.updCurrentSession(sessionInfo, user, "logout");
    return successResponse({});
  }

  async send_code(phone: string): Promise<Record<string, any>> {
    if (!phone) {
      return badRequestResponse("Invalid phone");
    }

    const userDetails = await this.usersRepository
      .createQueryBuilder("users")
      .where("users.phone = :phone", { phone: phone })
      .getOne();

    const code = this.makeCode(4);

    if (!userDetails) {
      const userData = {
        phone: phone,
        code: bcrypt.hashSync(code, 10),
      };
      await this.usersRepository
        .save(userData)
        .then(() => {
          return successResponse("Code sent successfully");
        })
        .catch((error) => {
          return internalErrorResponse(error);
        });
    } else {
      phone = userDetails.phone;
      const newUserData = { ...userDetails, code: bcrypt.hashSync(code, 10) };
      await this.usersRepository
        .save(newUserData)
        .then(() => {
          return successResponse("Code sent successfully");
        })
        .catch((error) => {
          return internalErrorResponse(error);
        });
    }

    // TODO Вынести в константы
    const data: any = await this.post("https://online.sigmasms.ru/api/login", {
      username: "Cheresergey@gmail.com",
      password: "JMv0d9",
    });

    if (data) {
      const token = JSON.parse(data).token;
      await this.post(
        "https://online.sigmasms.ru/api/sendings",
        {
          recipient: phone,
          type: "sms",
          payload: {
            sender: "B-Media",
            text: code,
          },
        },
        token
      );
    }

    return successResponse("Code sent successfully");
  }

  makeTemporaryPass(length) {
    let result = "";
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result.toString();
  }

  makeCode(length) {
    let result = "";
    const characters = "0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result.toString();
  }

  async post(url, data, token = null) {
    const dataString = JSON.stringify(data);
    const options = {
      method: "POST",
      headers: token
        ? {
            Authorization: token,
            "Content-Type": "application/json",
            "Content-Length": dataString.length,
          }
        : {
            "Content-Type": "application/json",
            "Content-Length": dataString.length,
          },
      timeout: 5000,
    };

    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        if (res.statusCode < 200 || res.statusCode > 299) {
          return reject(new Error(`HTTP status code ${res.statusCode}`));
        }

        const body = [];
        res.on("data", (chunk) => body.push(chunk));
        res.on("end", () => {
          const resString = Buffer.concat(body).toString();
          resolve(resString);
        });
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request time out"));
      });

      req.write(dataString);
      req.end();
    });
  }

  async refreshTokens(
    id: number,
    refresh_token: string
  ): Promise<Record<string, any>> {
    const user = await this.usersRepository
      .createQueryBuilder("users")
      .where("users.id = :id", { id: id })
      .getOne();

    if (user == null || !user.refresh_token) {
      return unAuthorizeResponse();
    }

    const refreshTokenMatches = await argon2.verify(
      user.refresh_token,
      refresh_token
    );

    if (!refreshTokenMatches) {
      return badRequestResponse("Refresh token invalid");
    }
    const tokens = await this.getTokens(user.id, user.phone);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    return successResponse({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
  }

  async refreshTokensV2(userId: number, refresh_token: string, headers) {
    const sessionInfo = getIdentifier(headers);
    const user = await this.userService.getUser(userId, {
      sessions: true,
    });
    const currenSession = user.sessions.find(
      (i) => i.identifier === sessionInfo.identifier
    );
    if (!currenSession || !currenSession.refresh_token) {
      return unAuthorizeResponse();
    }
    const refreshTokenMatches = await argon2.verify(
      currenSession.refresh_token,
      refresh_token
    );
    if (!refreshTokenMatches) {
      return badRequestResponse("Refresh token invalid");
    }
    const tokens = await this.updCurrentSession(sessionInfo, user, "refresh");
    return successResponse({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
  }

  async updateRefreshToken(userId: number, refreshToken: string) {
    const hashedRefreshToken = await this.hashData(refreshToken);
    await this.usersRepository.update(userId, {
      refresh_token: hashedRefreshToken,
    });
  }

  async updCurrentSession(sessionInfo, user, action) {
    const tokens = await this.getTokens(
      user.id,
      user.phone,
      sessionInfo.identifier
    );
    const hashedRefreshToken = await this.hashData(tokens.refresh_token);
    if (action === "login") {
      const currentSession = user.sessions.find(
        (i) => i.identifier === sessionInfo.identifier
      );
      if (currentSession) {
        await this.sessionRepository.update(
          { identifier: sessionInfo.identifier },
          { refresh_token: hashedRefreshToken }
        );
        user.sessions = user.sessions.map((i) => {
          if (i.identifier === sessionInfo.identifier) {
            return { ...i, refresh_token: hashedRefreshToken };
          }
          return i;
        });
      } else {
        const newSession = await this.sessionRepository.save({
          ...sessionInfo,
          refresh_token: hashedRefreshToken,
        });
        user.sessions = [...user.sessions, newSession];
      }
    }
    if (action === "logout") {
      const currentSession = user.sessions.find(
        (i) => i.identifier === sessionInfo.identifier
      );
      await this.sessionRepository.delete({
        identifier: currentSession.identifier,
      });
      user.sessions = user.sessions.filter(
        (i) => i.identifier !== currentSession.identifier
      );
    }
    if (action === "refresh") {
      await this.sessionRepository.update(
        { identifier: sessionInfo.identifier },
        { refresh_token: hashedRefreshToken }
      );
      user.sessions = user.sessions.map((i) => {
        if (i.identifier === sessionInfo.identifier) {
          return { ...i, refresh_token: hashedRefreshToken };
        }
        return i;
      });
    }
    await this.usersRepository.save(user);
    return tokens;
  }

  async getTokens(userId: number, phone: string, identifier?: string) {
    return {
      access_token: this.jwtService.sign(
        {
          identifier: identifier || "",
          phone: phone,
          id: userId,
        },
        {
          secret: `${process.env.SECRET.replace(/\\\\n/gm, "\\n")}`,
          expiresIn: "15m",
        }
      ),
      refresh_token: this.jwtService.sign(
        {
          phone: phone,
          id: userId,
        },
        {
          secret: `${process.env.SECRET_REFRESH.replace(/\\\\n/gm, "\\n")}`,
          expiresIn: "7d",
        }
      ),
    };
  }

  async deleteFirebaseToken(userId: number, token: string) {
    const profile = await this.usersRepository
      .createQueryBuilder("users")
      .where("users.id = :id", { id: userId })
      .getOne();

    if (profile.fb_tokens.includes(token)) {
      const tokens = profile.fb_tokens;
      const targetTokenIndex = tokens.indexOf(token);
      tokens.splice(targetTokenIndex, 1);

      const profileUpdated = { ...profile, fb_tokens: tokens };
      await this.usersRepository.save(profileUpdated);
      return successResponse(tokens);
    }
  }

  async createNotificationToken(userId: number, body, headers) {
    const sessionInfo = getIdentifier(headers);
    const user = await this.userService.getUser(userId, {
      sessions: true,
    });
    const currentSession = user.sessions.find(
      (i) => i.identifier === sessionInfo.identifier
    );
    if (!currentSession) return badRequestResponse("session not found");
    try {
      await this.sessionRepository.save({
        ...currentSession,
        ...body,
      });
      return successResponse(body);
    } catch (e) {
      return badRequestResponse("failed to update session");
    }
  }

  hashData(data: string) {
    return argon2.hash(data);
  }

  async getSessions(userId) {
    const user = await this.userService.getUser(userId, {
      sessions: true,
    });
    const sessions = user.sessions.map((i) => getSessionSchema(i));

    return successResponse({ sessions });
  }
}
