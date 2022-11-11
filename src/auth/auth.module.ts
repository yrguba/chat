import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategy/jwt.strategy";
import { JwtRefreshStrategy } from "./strategy/jwt.refresh.strategy";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "../database/entities/user.entity";
import { UsersService } from "../users/users.service";
import { ContactEntity } from "../database/entities/contact.entity";
import { SharedService } from "../shared/shared.service";
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";
import { SessionEntity } from "../database/entities/session.entity";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          //publicKey: configService.get<string>('keys.publicKey'),
          signOptions: { expiresIn: "1d" },
          secret: configService.get<string>("keys.secret"),
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      ContactEntity,
      ChatsEntity,
      MessageEntity,
      SessionEntity,
    ]),
    HttpModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    UsersService,
    SharedService,
  ],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
