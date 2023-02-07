import { Module, Global } from "@nestjs/common";
import { EmployeeController } from "./employee.controller";
import { EmployeeService } from "./employee.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmployeeEntity } from "../../database/entities/employee.entity";
import { AuthorizationService } from "../authorization/authorization.service";

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
  controllers: [EmployeeController],
  exports: [EmployeeService],
})
export class EmployeeModule {}
