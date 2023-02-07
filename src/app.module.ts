import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./auth/auth.module";
import { AuthorizationModule } from "./api_v3/authorization/authorization.module";
import { EmployeeModule } from "./api_v3/employee/employee.module";
import { ProfileModule } from "./profile/profile.module";
import { ChatsModule } from "./chats/chats.module";
import { UsersModule } from "./users/users.module";
import { UserEntity } from "./database/entities/user.entity";
import { EmployeeEntity } from "./database/entities/employee.entity";
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
import { SessionEntity } from "./database/entities/session.entity";
import { HttpModule } from "./http/http.module";
import { NotificationsModule } from "./notifications/notifications.module";

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
        EmployeeEntity,
        UserEntity,
        ChatsEntity,
        MessageEntity,
        ContactEntity,
        AppEntity,
        ReactionsEntity,
        SessionEntity,
      ],
      synchronize: true,
    }),
    AuthModule,
    AuthorizationModule,
    EmployeeModule,
    ProfileModule,
    ChatsModule,
    UsersModule,
    ContactsModule,
    FilesModule,
    ChatGateway,
    SharedModule,
    MessagesModule,
    HttpModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
