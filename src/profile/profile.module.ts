import { Module } from "@nestjs/common";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "../database/entities/user.entity";
import { JwtModule } from "@nestjs/jwt";
import { FilesService } from "../files/files.service";
import { AppEntity } from "../database/entities/app.entity";
import { UsersService } from "../users/users.service";
import { ContactEntity } from "../database/entities/contact.entity";
import { SharedService } from "../shared/shared.service";
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";
import { AuthService } from "../auth/auth.service";
import { SessionEntity } from "../database/entities/session.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      AppEntity,
      ContactEntity,
      ChatsEntity,
      MessageEntity,
      SessionEntity,
    ]),
    JwtModule,
  ],
  providers: [
    ProfileService,
    FilesService,
    UsersService,
    SharedService,
    AuthService,
  ],
  controllers: [ProfileController],
  exports: [ProfileService],
})
export class ProfileModule {}
