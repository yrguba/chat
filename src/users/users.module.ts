import { Module, Global } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "../database/entities/user.entity";
import { ContactEntity } from "../database/entities/contact.entity";
import { JwtModule } from "@nestjs/jwt";
import { ContactsService } from "../contacts/contacts.service";
import { SharedService } from "../shared/shared.service";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, ContactEntity]), JwtModule],
  providers: [UsersService, ContactsService, SharedService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
