import { Body, Controller, Post, Patch, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { ApiTags } from '@nestjs/swagger';
import { PhoneDTO } from './dto/phone.dto';

@ApiTags('authorization')
@Controller('authorization')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('send_code')
  async send_code(@Req() req, @Res() res, @Body() body: PhoneDTO) {
    const response = await this.authService.send_code(body.phone);
    res.status(response.status).json(response.message);
  }

  @Post('login')
  async login(@Req() req, @Res() res, @Body() body: LoginDTO) {
    const auth = await this.authService.login(body);
    res.status(auth.status).json(auth.message);
  }
}
