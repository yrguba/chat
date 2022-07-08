import {
  Body,
  Controller,
  Get,
  Patch,
  Res,
  Req,
  Param,
  UseGuards
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ApiTags, ApiParam } from '@nestjs/swagger';
import { ProfileDTO } from './dto/profile.dto';
import { JwtAuthGuard } from '../auth/strategy/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';

@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(
      private profileService: ProfileService,
      private readonly jwtService: JwtService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('/')
  async getUser(@Res() res, @Req() req) {
    const jwt = req.headers.authorization.replace('Bearer ', '');
    const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
    const profile = await this.profileService.getProfile(json.id);
    res.json(profile);
  }

  @Patch('/')
  async updateUser(@Res() res, @Req() req, @Body() body: ProfileDTO) {
    const jwt = req.headers.authorization.replace('Bearer ', '');
    const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
    const user = await this.profileService.updateProfile(json.id, body);
    res.json(user);
  }
}
