import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { ChatsModule } from "./chats/chats.module";
import { UsersModule } from "./users/users.module";
import { UserEntity } from './database/entities/user.entity';
import { ChatsEntity } from "./database/entities/chats.entity";
import { MessageEntity } from "./database/entities/message.entity";
import { ChatGateway } from './chat.gateway';

import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
      exclude: ['/api*'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URI,
      entities: [UserEntity, ChatsEntity, MessageEntity],
      synchronize: true,
    }),
    AuthModule,
    ProfileModule,
    ChatsModule,
    UsersModule,
    ChatGateway
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
