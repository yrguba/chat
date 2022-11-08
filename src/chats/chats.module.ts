import { Module } from "@nestjs/common";
import { ChatsController } from "./chats.controller";
import { ChatsService } from "./chats.service";
import { UsersService } from "../users/users.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";
import { UserEntity } from "../database/entities/user.entity";
import { ContactEntity } from "../database/entities/contact.entity";

import { ChatsGateway } from "./chats.gateway";
import { SharedService } from "../shared/shared.service";
import { MessagesService } from "../messages/messages.service";
import { MessagesGateway } from "../messages/messages.gateway";
import { ReactionsEntity } from "../database/entities/reactions.entity";
import { FilesService } from "../files/files.service";
import { AppEntity } from "../database/entities/app.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatsEntity,
      MessageEntity,
      UserEntity,
      ContactEntity,
      ReactionsEntity,
      AppEntity,
    ]),
    JwtModule,
  ],
  providers: [
    ChatsService,
    ChatsGateway,
    MessagesService,
    MessagesGateway,
    UsersService,
    SharedService,
    FilesService,
  ],
  controllers: [ChatsController],
  exports: [ChatsService],
})
export class ChatsModule {}
