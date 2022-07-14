"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatsModule = void 0;
const common_1 = require("@nestjs/common");
const chats_controller_1 = require("./chats.controller");
const chats_service_1 = require("./chats.service");
const users_service_1 = require("../users/users.service");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const chats_entity_1 = require("../database/entities/chats.entity");
const message_entity_1 = require("../database/entities/message.entity");
const user_entity_1 = require("../database/entities/user.entity");
const chats_gateway_1 = require("./chats.gateway");
let ChatsModule = class ChatsModule {
};
ChatsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([chats_entity_1.ChatsEntity, message_entity_1.MessageEntity, user_entity_1.UserEntity]), jwt_1.JwtModule],
        providers: [chats_service_1.ChatsService, chats_gateway_1.ChatsGateway, users_service_1.UsersService],
        controllers: [chats_controller_1.ChatsController],
        exports: [chats_service_1.ChatsService],
    })
], ChatsModule);
exports.ChatsModule = ChatsModule;
//# sourceMappingURL=chats.module.js.map