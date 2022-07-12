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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageEntity = void 0;
const typeorm_1 = require("typeorm");
const chats_entity_1 = require("./chats.entity");
let MessageEntity = class MessageEntity {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], MessageEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], MessageEntity.prototype, "initiator_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: false }),
    __metadata("design:type", String)
], MessageEntity.prototype, "text", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: false, default: 'text' }),
    __metadata("design:type", String)
], MessageEntity.prototype, "message_type", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], MessageEntity.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => chats_entity_1.ChatsEntity, (chat) => chat.message, {
        onDelete: 'CASCADE',
    }),
    __metadata("design:type", chats_entity_1.ChatsEntity)
], MessageEntity.prototype, "chat", void 0);
MessageEntity = __decorate([
    (0, typeorm_1.Entity)()
], MessageEntity);
exports.MessageEntity = MessageEntity;
//# sourceMappingURL=message.entity.js.map