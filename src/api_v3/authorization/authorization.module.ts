import { Module, Global } from "@nestjs/common";

import { AuthorizationController } from "./authorization.controller";
import { AuthorizationService } from "./authorization.service";

import { TypeOrmModule } from "@nestjs/typeorm";
import { EmployeeEntity } from "../../database/entities/employee.entity";
import {EmployeeService} from "../employee/employee.service";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmployeeEntity,
    ]),
  ],
  providers: [
    AuthorizationService,
    EmployeeService,
  ],
  controllers: [AuthorizationController],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}
