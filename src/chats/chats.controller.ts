import {
    Body,
    Controller,
    Get,
    Post,
    Res,
    Req,
    Param,
    UseGuards,
    Query,
    DefaultValuePipe,
    ParseIntPipe, Delete,
} from '@nestjs/common';
import { ChatsService } from './chats.service';
import { ChatsGateway } from "./chats.gateway";
import { ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ChatDTO } from './dto/chat.dto';
import { MessageDTO } from "./dto/message.dto";
import { JwtAuthGuard } from '../auth/strategy/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';

@ApiTags('chats')
@Controller('chats')
export class ChatsController {
    constructor(
        private chatsService: ChatsService,
        private readonly jwtService: JwtService,
        private chatsGateway: ChatsGateway
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get('/')
    @ApiQuery({
        name: 'page',
        description: 'Текущая страница',
        required: false,
        type: Number,
    })
    @ApiQuery({
        name: 'limit',
        description: 'Количество записей на странице',
        required: false,
        type: Number,
    })
    async getChats(
      @Res() res,
      @Req() req,
      @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
      @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
    ) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        const chats = await this.chatsService.getChats(json.id,
          {
                page,
                limit,
            }
        );
        res.status(chats.status).json(chats.data);
    }

    @UseGuards(JwtAuthGuard)
    @ApiParam({ name: 'chat_id', required: true })
    @Get('/:chat_id')
    async getChat(@Res() res, @Req() req, @Param() param) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        const chat = await this.chatsService.getChat(json.id, param.chat_id,);
        res.status(chat.status).json(chat.data);
    }

    @UseGuards(JwtAuthGuard)
    @Post('/')
    async createChat(@Res() res, @Req() req, @Body() body: ChatDTO) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        const chatUsers = body.users;
        chatUsers.push(json.id);
        const chat = await this.chatsService.createChat(body);
        res.status(chat.status).json(chat.data);
    }

    @UseGuards(JwtAuthGuard)
    @ApiParam({ name: 'chat_id', required: true })
    @Delete('/:chat_id')
    async deleteChat(@Res() res, @Req() req, @Param() params) {
        const result =  await this.chatsService.deleteChat(params.chat_id);
        res.status(200).json({data: result});
    }

    @UseGuards(JwtAuthGuard)
    @ApiParam({ name: 'chat_id', required: true })
    @Post('/message/:chat_id')
    async createMessage(@Res() res, @Req() req, @Body() body: MessageDTO, @Param() param) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        const message = await this.chatsService.createMessage(param.chat_id, Number(json.id), body);

        if (message?.status === 201) {
            this.chatsGateway.handleEmit({
                chat_id: param.chat_id,
                ...message
            });
        }
        res.status(message.status).json(message.data);
    }

    // @Patch('/')
    // async addUserToChat(@Res() res, @Req() req, @Body() user_id: number) {
    //     const jwt = req.headers.authorization.replace('Bearer ', '');
    //     const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
    //     const user = await this.chatsService.addUserToChat(json.id, body);
    //     res.json(user);
    // }
}
