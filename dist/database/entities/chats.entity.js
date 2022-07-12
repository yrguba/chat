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
exports.ChatsEntity = void 0;
const typeorm_1 = require("typeorm");
const message_entity_1 = require("./message.entity");
let ChatsEntity = class ChatsEntity {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ChatsEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, default: 'Чат' }),
    __metadata("design:type", String)
], ChatsEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ChatsEntity.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.Column)("int", { array: true }),
    __metadata("design:type", Array)
], ChatsEntity.prototype, "users", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => message_entity_1.MessageEntity, (message) => message.chat),
    __metadata("design:type", Array)
], ChatsEntity.prototype, "message", void 0);
ChatsEntity = __decorate([
    (0, typeorm_1.Entity)()
], ChatsEntity);
exports.ChatsEntity = ChatsEntity;
//# sourceMappingURL=chats.entity.js.map