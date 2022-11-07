import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./auth/auth.module";
import { ProfileModule } from "./profile/profile.module";
import { ChatsModule } from "./chats/chats.module";
import { UsersModule } from "./users/users.module";
import { UserEntity } from "./database/entities/user.entity";
import { ChatsEntity } from "./database/entities/chats.entity";
import { MessageEntity } from "./database/entities/message.entity";
import { ContactEntity } from "./database/entities/contact.entity";
import { AppEntity } from "./database/entities/app.entity";
import { ChatGateway } from "./chat.gateway";

import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { ContactsModule } from "./contacts/contacts.module";
import { FilesModule } from "./files/files.module";
import { SharedModule } from "./shared/shared.module";
import { MessagesModule } from "./messages/messages.module";
import { ReactionsEntity } from "./database/entities/reactions.entity";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ServeStaticModule.forRoot({
      serveRoot: "/",
      rootPath: join(__dirname, "..", "client"),
      exclude: ["/api*"],
    }),
    ServeStaticModule.forRoot({
      serveRoot: "/storage",
      rootPath: join(__dirname, "..", "storage"),
      exclude: ["/api*"],
    }),
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DATABASE_URI,
      entities: [
        UserEntity,
        ChatsEntity,
        MessageEntity,
        ContactEntity,
        AppEntity,
        ReactionsEntity,
      ],
      synchronize: true,
    }),
    AuthModule,
    ProfileModule,
    ChatsModule,
    UsersModule,
    ContactsModule,
    FilesModule,
    ChatGateway,
    SharedModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
