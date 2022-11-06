import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";
import { UserEntity } from "../database/entities/user.entity";
import { ContactEntity } from "../database/entities/contact.entity";
import { JwtModule } from "@nestjs/jwt";
import { ChatsService } from "../chats/chats.service";
import { ChatsGateway } from "../chats/chats.gateway";
import { UsersService } from "../users/users.service";
import { SharedService } from "../shared/shared.service";
import { MessagesService } from "./messages.service";
import { MessagesController } from "./messages.controller";
import { MessagesGateway } from "./messages.gateway";
import { ReactionsEntity } from "../database/entities/reactions.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatsEntity,
      MessageEntity,
      UserEntity,
      ContactEntity,
      ReactionsEntity,
    ]),
    JwtModule,
  ],
  providers: [
    MessagesService,
    MessagesGateway,
    ChatsService,
    ChatsGateway,
    UsersService,
    SharedService,
  ],
  controllers: [MessagesController],
  exports: [MessagesService],
})
export class MessagesModule {}