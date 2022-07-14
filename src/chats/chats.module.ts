import { Module } from '@nestjs/common';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { UsersService } from "../users/users.service";
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";
import { UserEntity } from "../database/entities/user.entity";

import { ChatsGateway } from "./chats.gateway";

@Module({
    imports: [TypeOrmModule.forFeature([ChatsEntity, MessageEntity, UserEntity]), JwtModule],
    providers: [ChatsService, ChatsGateway, UsersService],
    controllers: [ChatsController],
    exports: [ChatsService],
})
export class ChatsModule {}
