import { Module } from "@nestjs/common";
import { SharedService } from "./shared.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";
import { UserEntity } from "../database/entities/user.entity";
import { ContactEntity } from "../database/entities/contact.entity";

@Module({
  controllers: [],
  providers: [],
  imports: [
    TypeOrmModule.forFeature([
      ChatsEntity,
      MessageEntity,
      UserEntity,
      ContactEntity,
    ]),
  ],
})
export class SharedModule {}
