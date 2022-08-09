import { Injectable } from '@nestjs/common';
import { LoginDTO } from './dto/login.dto';
import { validate } from 'class-validator';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { HttpService } from '@nestjs/axios';
import * as https from 'https';

@Injectable()
export class AuthService {
  constructor(
    //private logger: LoggerService,
    private jwtService: JwtService,
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private readonly httpService: HttpService,
  ) {}

  async login(user: any): Promise<Record<string, any>> {
    // Validation Flag
    let isOk = false;

    // Transform body into DTO
    const userData = new LoginDTO();
    userData.phone = user.phone;
    userData.code = user.code;

    // Validate DTO against validate function from class-validator
    await validate(userData).then((errors) => {
      if (errors.length > 0) {
        //this.logger.debug(`${errors}`, AuthService.name);
      } else {
        isOk = true;
      }
    });

    if (isOk) {
      // Get user information

      const userDetails = await this.usersRepository
        .createQueryBuilder('users')
        .where('users.phone = :phone', { phone: user.phone })
        .getOne();

      if (userDetails == null) {
        return { status: 401, data: {
          error: {
            code: 401,
            message: "Invalid credentials"
          }
        }};
      }

      // Check if the given password match with saved password
      const isValid = bcrypt.compareSync(user.code, userDetails.code);
      if (isValid) {
        delete userDetails.code;
        return {
          status: 200,
          data: {
            data: {
              access_token: this.jwtService.sign({
                phone: user.phone,
                id: userDetails.id,
              }),
              ...userDetails,
            }
          },
        };
      } else {
        return { status: 401, data: {
          error: {
            code: 401,
            message: "Invalid credentials"
          }
        }};
      }
    } else {
      return { status: 400, data: {
        error: {
          code: 400,
          message: "Invalid fields"
        }
      }};
    }
  }

  async send_code(phone: string): Promise<Record<string, any>> {
    if (!phone) {
      return { status: 400, data: {
        error: {
          code: 400,
          message: "Invalid phone"
        }
      }};
    }

    const userDetails = await this.usersRepository
      .createQueryBuilder('users')
      .where('users.phone = :phone', { phone: phone })
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
          return {
            status: 200,
            data: {
              data: 'Code sent successfully'
            }
          };
        })
        .catch((error) => {
          return { status: 500, data: {
            error: {
              code: 500,
              message: error
            }
          }};
        });
    } else {
      phone = userDetails.phone;
      const newUserData = { ...userDetails, code: bcrypt.hashSync(code, 10) };
      await this.usersRepository
        .save(newUserData)
        .then(() => {
          return {
            status: 200,
            data: {
              data: 'Code sent successfully'
            }
          };
        })
        .catch((error) => {
          return { status: 500, data: {
              error: {
                code: 500,
                message: error
              }
            }};
        });
    }

    const data = await this.post('https://online.sigmasms.ru/api/login', {
      username: 'Cheresergey@gmail.com',
      password: 'JMv0d9',
    });

    if (data) {
      const token = JSON.parse(<string>data).token;
      await this.post(
        'https://online.sigmasms.ru/api/sendings',
        {
          recipient: phone,
          type: 'sms',
          payload: {
            sender: 'B-Media',
            text: code,
          },
        },
        token,
      );
    }

    return {
      status: 200,
      data: {
        data: 'Code sent successfully'
      }
    };
  }

  makeTemporaryPass(length) {
    let result = '';
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result.toString();
  }

  makeCode(length) {
    let result = '';
    const characters = '0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result.toString();
  }

  async post(url, data, token = null) {
    const dataString = JSON.stringify(data);

    const options = {
      method: 'POST',
      headers: token
        ? {
            Authorization: token,
            'Content-Type': 'application/json',
            'Content-Length': dataString.length,
          }
        : {
            'Content-Type': 'application/json',
            'Content-Length': dataString.length,
          },
      timeout: 5000, // in ms
    };

    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        if (res.statusCode < 200 || res.statusCode > 299) {
          return reject(new Error(`HTTP status code ${res.statusCode}`));
        }

        const body = [];
        res.on('data', (chunk) => body.push(chunk));
        res.on('end', () => {
          const resString = Buffer.concat(body).toString();
          resolve(resString);
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request time out'));
      });

      req.write(dataString);
      req.end();
    });
  }
}
