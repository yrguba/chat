import { Body, Controller, Post, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtService } from "@nestjs/jwt";
import { LoginDTO } from './dto/login.dto';
import { RefreshDTO } from './dto/refresh.dto';
import { ApiTags } from '@nestjs/swagger';
import { PhoneDTO } from './dto/phone.dto';
import { JwtAuthGuard } from "./strategy/jwt-auth.guard";

@ApiTags('authorization')
@Controller('authorization')
export class AuthController {
  constructor(
      private authService: AuthService,
      private readonly jwtService: JwtService
  ) {}

    @Post('send_code')
    async send_code(@Req() req, @Res() res, @Body() body: PhoneDTO) {
      const response = await this.authService.send_code(body.phone);
      res.status(response.status).json(response.data);
    }

    @Post('login')
    async login(@Req() req, @Res() res, @Body() body: LoginDTO) {
      const auth = await this.authService.login(body);
      res.status(auth.status).json(auth.data);
    }

    //@UseGuards(JwtAuthGuard)
    @Post('refresh')
    async refreshTokens(@Res() res, @Req() req, @Body() body: RefreshDTO) {
      const json = this.jwtService.decode(body.access_token, { json: true }) as { id: number };
      const tokens = await this.authService.refreshTokens(json.id, body.refresh_token);
      res.status(tokens.status).json(tokens.data);
    }
}
