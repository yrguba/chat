import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";

import { EmployeeService } from "../employee/employee.service";
import { EmployeeEntity } from "../../database/entities/employee.entity";

import { getEmployeeSchema } from "../services/schema";
import {
  badRequestResponse,
  notFoundRequestResponse,
  successResponse,
} from "../services/response";


@Injectable()
export class AuthorizationService {
  constructor(
    private employeeService: EmployeeService,
    @InjectRepository(EmployeeEntity)
    private employeeRepository: Repository<EmployeeEntity>,
  ) {}

  async authorization(authorizationData: any) {
    const employee = await this.employeeService.findEmployee(authorizationData.phone);
    if (!employee) return notFoundRequestResponse("employee not found");

    const isValidPassword = bcrypt.compareSync(employee.password, authorizationData.password);

    console.log(employee.password, authorizationData.password);

    if (!isValidPassword) return badRequestResponse("invalid credential");

    return successResponse(getEmployeeSchema(employee));
  }

  async reg(authorizationData: any) {
    const newEmployee = await this.employeeRepository.save({
      name: authorizationData.name,
      email: authorizationData.email,
      password: bcrypt.hashSync(authorizationData.password, 10),
    });

    return successResponse(getEmployeeSchema(newEmployee));
  }
}
