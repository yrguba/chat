import { Module, Global } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "../database/entities/user.entity";
import { ContactEntity } from "../database/entities/contact.entity";
import { JwtModule } from "@nestjs/jwt";
import { ContactsService } from "../contacts/contacts.service";
import { SharedService } from "../shared/shared.service";
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      ContactEntity,
      ChatsEntity,
      MessageEntity,
    ]),
    JwtModule,
  ],
  providers: [UsersService, ContactsService, SharedService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
