import {
  Controller, Get, Req, Res, UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {UsersService} from "../../users/users.service";
import {JwtService} from "@nestjs/jwt";
import {JwtAuthGuard} from "../../auth/strategy/jwt-auth.guard";


import { EmployeeService } from "./employee.service";

@ApiTags("Employee")
@Controller("employee")
export class EmployeeController {
  constructor(
    private employeeService: EmployeeService,
  ) {}

  @Get("/")
  async getEmployee(@Res() res, @Req() req) {
    const response = await this.employeeService.getEmployee();
    res.status(response.status).json(response.data);
  }
}
