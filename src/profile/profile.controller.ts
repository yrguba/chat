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
import { ApiTags } from '@nestjs/swagger';
import { ProfileEmptyDTO } from './dto/profile.empty.dto';
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
    res.status(profile.status).json(profile.data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/')
  async updateUser(@Res() res, @Req() req, @Body() body: ProfileEmptyDTO) {
    const jwt = req.headers.authorization.replace('Bearer ', '');
    const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
    const profile = await this.profileService.updateProfile(json.id, body);
    res.status(profile.status).json(profile.data);
  }
}
