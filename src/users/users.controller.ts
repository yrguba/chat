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
import {JwtService} from "@nestjs/jwt";

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(
        private usersService: UsersService,
        private readonly jwtService: JwtService,
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get('/')
    async getUsers(@Res() res, @Req() req) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        const users = await this.usersService.getUsers(json.id);
        res.status(users.status).json(users.data);
    }
}
