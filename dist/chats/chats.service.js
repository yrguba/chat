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
exports.ChatsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const chats_entity_1 = require("../database/entities/chats.entity");
const message_entity_1 = require("../database/entities/message.entity");
let ChatsService = class ChatsService {
    constructor(chatsRepository, messageRepository) {
        this.chatsRepository = chatsRepository;
        this.messageRepository = messageRepository;
    }
    async createChat(data) {
        return await this.chatsRepository.save(data);
    }
    async getChat(chat_id) {
        return await this.chatsRepository.createQueryBuilder('chat')
            .leftJoinAndSelect('chat.message', 'message')
            .where('chat.id = :id', { id: chat_id })
            .getOne();
    }
    async getChats(user_id) {
        return await this.chatsRepository.createQueryBuilder('chats')
            .leftJoinAndSelect('chats.message', 'message')
            .where('chats.users @> :users', { users: [user_id] })
            .getMany();
    }
    async addUserToChat(user_id, chat_id) {
        const chat = await this.chatsRepository.createQueryBuilder('chat')
            .where('chat.id = :id', { id: chat_id })
            .getOne();
        const updated = Object.assign(chat, {});
        if (chat) {
            updated.users.push(user_id);
        }
        return await this.chatsRepository.save(updated);
    }
    async createMessage(chat_id, user_id, data) {
        console.log(user_id);
        data.initiator_id = Number(user_id);
        const message = await this.messageRepository.save(data);
        const chat = await this.chatsRepository.findOne({
            where: { id: chat_id },
            relations: ['message'],
        });
        chat.message.push(message);
        await this.chatsRepository.save(chat);
        return message;
    }
};
ChatsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chats_entity_1.ChatsEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(message_entity_1.MessageEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ChatsService);
exports.ChatsService = ChatsService;
//# sourceMappingURL=chats.service.js.map