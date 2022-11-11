import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";
import { UserEntity } from "../database/entities/user.entity";
import { ContactEntity } from "../database/entities/contact.entity";
import { JwtModule } from "@nestjs/jwt";

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
    JwtModule,
  ],
})
export class SharedModule {}
