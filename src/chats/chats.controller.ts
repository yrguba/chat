import {
    Body,
    Controller,
    Get,
    Patch,
    Post,
    Res,
    Req,
    Param,
    UseGuards
} from '@nestjs/common';
import { ChatsService } from './chats.service';
import { ApiTags, ApiParam } from '@nestjs/swagger';
import { ChatDTO } from './dto/chat.dto';
import { MessageDTO } from "./dto/message.dto";
import { JwtAuthGuard } from '../auth/strategy/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';

@ApiTags('chats')
@Controller('chats')
export class ChatsController {
    constructor(
        private chatsService: ChatsService,
        private readonly jwtService: JwtService
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get('/')
    async getChats(@Res() res, @Req() req) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        const chats = await this.chatsService.getChats(json.id);
        res.json(chats);
    }

    @UseGuards(JwtAuthGuard)
    @ApiParam({ name: 'chat_id', required: true })
    @Get('/:chat_id')
    async getChat(@Res() res, @Req() req, @Param() param) {
        const chat = await this.chatsService.getChat(param.chat_id,);
        res.json(chat);
    }

    @UseGuards(JwtAuthGuard)
    @Post('/')
    async createChat(@Res() res, @Req() req, @Body() body: ChatDTO) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        const chatUsers = body.users;
        chatUsers.push(json.id);
        const chat = await this.chatsService.createChat(body);
        res.json(chat);
    }

    // @UseGuards(JwtAuthGuard)
    // @ApiParam({ name: 'chat_id', required: true })
    // @Post('/message/:chat_id')
    // async createMessage(@Res() res, @Req() req, @Body() body: MessageDTO, @Param() param) {
    //     const jwt = req.headers.authorization.replace('Bearer ', '');
    //     const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
    //     const message = await this.chatsService.createMessage(param.chat_id, Number(json.id), body);
    //     res.json(message);
    // }

    // @Patch('/')
    // async addUserToChat(@Res() res, @Req() req, @Body() user_id: number) {
    //     const jwt = req.headers.authorization.replace('Bearer ', '');
    //     const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
    //     const user = await this.chatsService.addUserToChat(json.id, body);
    //     res.json(user);
    // }
}
