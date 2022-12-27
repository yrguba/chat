import { Module, Global } from "@nestjs/common";
import { ContactsController } from "./contacts.controller";
import { ContactsService } from "./contacts.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "../database/entities/user.entity";
import { ContactEntity } from "../database/entities/contact.entity";
import { JwtModule } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { SharedService } from "../shared/shared.service";
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";
import { ChatsService } from "../chats/chats.service";
import { ReactionsEntity } from "../database/entities/reactions.entity";
import { MessagesService } from "../messages/messages.service";
import { FilesService } from "../files/files.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AppEntity } from "../database/entities/app.entity";
import { ChatsGateway } from "../chats/chats.gateway";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContactEntity,
      UserEntity,
      ChatsEntity,
      MessageEntity,
      ReactionsEntity,
      AppEntity,
    ]),
    JwtModule,
  ],
  providers: [
    ContactsService,
    UsersService,
    SharedService,
    ChatsService,
    MessagesService,
    FilesService,
    NotificationsService,
    ChatsGateway,
  ],
  controllers: [ContactsController],
  exports: [ContactsService],
})
export class ContactsModule {}
