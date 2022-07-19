import {
    Controller,
    Get,
    Res,
    Req,
    UseGuards, Param
} from '@nestjs/common';
import { UsersService } from './users.service';
import {ApiParam, ApiTags} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategy/jwt-auth.guard';

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(
        private usersService: UsersService,
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get('/')
    async getUsers(@Res() res, @Req() req) {
        const users = await this.usersService.getUsers();
        res.status(users.status).json(users.data);
    }
}
