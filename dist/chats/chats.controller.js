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
exports.ChatsController = void 0;
const common_1 = require("@nestjs/common");
const chats_service_1 = require("./chats.service");
const chats_gateway_1 = require("./chats.gateway");
const swagger_1 = require("@nestjs/swagger");
const chat_dto_1 = require("./dto/chat.dto");
const message_dto_1 = require("./dto/message.dto");
const jwt_auth_guard_1 = require("../auth/strategy/jwt-auth.guard");
const jwt_1 = require("@nestjs/jwt");
let ChatsController = class ChatsController {
    constructor(chatsService, jwtService, chatsGateway) {
        this.chatsService = chatsService;
        this.jwtService = jwtService;
        this.chatsGateway = chatsGateway;
    }
    async getChats(res, req) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true });
        const chats = await this.chatsService.getChats(json.id);
        res.json(chats);
    }
    async getChat(res, req, param) {
        const chat = await this.chatsService.getChat(param.chat_id);
        res.json(chat);
    }
    async createChat(res, req, body) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true });
        const chatUsers = body.users;
        chatUsers.push(json.id);
        const chat = await this.chatsService.createChat(body);
        res.json(chat);
    }
    async createMessage(res, req, body, param) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true });
        const message = await this.chatsService.createMessage(param.chat_id, Number(json.id), body);
        this.chatsGateway.handleEmit(Object.assign({ chat_id: param.chat_id }, message));
        res.json(message);
    }
};
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('/'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "getChats", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiParam)({ name: 'chat_id', required: true }),
    (0, common_1.Get)('/:chat_id'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Param)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "getChat", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('/'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, chat_dto_1.ChatDTO]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "createChat", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiParam)({ name: 'chat_id', required: true }),
    (0, common_1.Post)('/message/:chat_id'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Param)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, message_dto_1.MessageDTO, Object]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "createMessage", null);
ChatsController = __decorate([
    (0, swagger_1.ApiTags)('chats'),
    (0, common_1.Controller)('chats'),
    __metadata("design:paramtypes", [chats_service_1.ChatsService,
        jwt_1.JwtService,
        chats_gateway_1.ChatsGateway])
], ChatsController);
exports.ChatsController = ChatsController;
//# sourceMappingURL=chats.controller.js.map