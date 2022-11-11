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

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContactEntity,
      UserEntity,
      ChatsEntity,
      MessageEntity,
    ]),
    JwtModule,
  ],
  providers: [ContactsService, UsersService, SharedService],
  controllers: [ContactsController],
  exports: [ContactsService],
})
export class ContactsModule {}
