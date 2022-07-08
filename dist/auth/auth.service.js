"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const login_dto_1 = require("./dto/login.dto");
const class_validator_1 = require("class-validator");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../database/entities/user.entity");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const axios_1 = require("@nestjs/axios");
const https = require("https");
let AuthService = class AuthService {
    constructor(jwtService, usersRepository, httpService) {
        this.jwtService = jwtService;
        this.usersRepository = usersRepository;
        this.httpService = httpService;
    }
    async login(user) {
        let isOk = false;
        const userData = new login_dto_1.LoginDTO();
        userData.phone = user.phone;
        userData.code = user.code;
        await (0, class_validator_1.validate)(userData).then((errors) => {
            if (errors.length > 0) {
            }
            else {
                isOk = true;
            }
        });
        if (isOk) {
            const userDetails = await this.usersRepository
                .createQueryBuilder('users')
                .where('users.phone = :phone', { phone: user.phone })
                .getOne();
            if (userDetails == null) {
                return { status: 401, message: { message: 'Invalid credentials' } };
            }
            console.log(user.code, userDetails.code);
            const isValid = bcrypt.compareSync(user.code, userDetails.code);
            console.log(isValid);
            if (isValid) {
                delete userDetails.code;
                return {
                    status: 200,
                    message: Object.assign({ access_token: this.jwtService.sign({
                            phone: user.phone,
                            id: userDetails.id,
                        }) }, userDetails),
                };
            }
            else {
                return { status: 401, message: { message: 'Invalid credentials' } };
            }
        }
        else {
            return { status: 400, message: { message: 'Invalid fields.' } };
        }
    }
    async send_code(phone) {
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
                return { status: 200, message: { message: 'success' } };
            })
                .catch((error) => {
                console.log(error);
            });
        }
        else {
            phone = userDetails.phone;
            const newUserData = Object.assign(Object.assign({}, userDetails), { code: bcrypt.hashSync(code, 10) });
            await this.usersRepository
                .save(newUserData)
                .then(() => {
                return { status: 200, message: { message: 'success' } };
            })
                .catch((error) => {
                console.log(error);
            });
        }
        const data = await this.post('https://online.sigmasms.ru/api/login', {
            username: 'Cheresergey@gmail.com',
            password: 'JMv0d9',
        });
        if (data) {
            const token = JSON.parse(data).token;
            await this.post('https://online.sigmasms.ru/api/sendings', {
                recipient: phone,
                type: 'sms',
                payload: {
                    sender: 'B-Media',
                    text: code,
                },
            }, token);
        }
        return { status: 200, message: { message: 'success send' } };
    }
    makeTemporaryPass(length) {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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
            timeout: 5000,
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
};
AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.UserEntity)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        typeorm_2.Repository,
        axios_1.HttpService])
], AuthService);
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map