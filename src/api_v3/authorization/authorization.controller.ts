import {
  Body,
  Controller,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { AuthorizationService } from "./authorization.service";
import { AuthorizationDTO } from "./dto/authorization.dto";
import { RegDTO } from "./dto/reg.dto";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Authorization/V3")
@Controller("authorization_v3")
export class AuthorizationController {
  constructor(
    private authorizationService: AuthorizationService,
  ) {}

  @Post("authorization")
  async authorization(
    @Req() req,
    @Res() res,
    @Body() body: AuthorizationDTO,
  ) {
    const response = await this.authorizationService.authorization(body);
    res.status(response.status).json(response.data);
  }

  @Post("reg")
  async reg(
    @Req() req,
    @Res() res,
    @Body() body: RegDTO,
  ) {
    const response = await this.authorizationService.reg(body);
    res.status(response.status).json(response.data);
  }
}
