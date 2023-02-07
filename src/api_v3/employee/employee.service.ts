import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { EmployeeEntity } from "../../database/entities/employee.entity";

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(EmployeeEntity)
    private employeeRepository: Repository<EmployeeEntity>,
  ) {}

  async findEmployee(email: string): Promise<any> {
    return await this.employeeRepository.findOne({
      where: { email: email },
    });
  }

  async getEmployee(): Promise<any> {
    return await this.employeeRepository.findAndCount();
  }
}
