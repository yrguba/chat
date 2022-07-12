import { Module } from '@nestjs/common';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";

@Module({
    imports: [TypeOrmModule.forFeature([ChatsEntity, MessageEntity]), JwtModule],
    providers: [ChatsService],
    controllers: [ChatsController],
    exports: [ChatsService],
})
export class ChatsModule {}
