import {
  Body,
  Controller,
  Get,
  Patch,
  Res,
  Param,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ApiTags, ApiParam } from '@nestjs/swagger';
import { ProfileDTO } from './dto/profile.dto';

@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get('/:id')
  @ApiParam({ name: 'id', required: true })
  async getUser(@Res() res, @Param() params) {
    const profile = await this.profileService.getProfile(params.id);
    res.json(profile);
  }

  @Patch('/:id')
  @ApiParam({ name: 'id', required: true })
  async updateUser(@Res() res, @Param() params, @Body() body: ProfileDTO) {
    const user = await this.profileService.updateProfile(params.id, body);
    res.json(user);
  }
}
