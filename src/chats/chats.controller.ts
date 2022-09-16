import {
    Body,
    Controller,
    Get,
    Post,
    Put,
    Res,
    Req,
    Patch,
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
import { ChatNameDTO } from "./dto/chatName.dto";
import { ChatAvatarDTO } from "./dto/chatAvatar.dto";
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
    @ApiQuery({
        name: 'like',
        description: 'Поиск по имени чата',
        required: false,
        //type: String,
    })
    async getChats(
      @Res() res,
      @Req() req,
      @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
      @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
      @Query('like', new DefaultValuePipe('')) like = '',
    ) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        const chats = await this.chatsService.getChats(json.id,
          {
                page,
                limit,
                like,
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
    @ApiParam({ name: 'user_id', required: true })
    @Get('/chat/with-user/:user_id')
    async getChatWithUser(@Res() res, @Req() req, @Param() param) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        const chat = await this.chatsService.getChatWithUser(json.id, param.user_id,);
        res.status(chat.status).json(chat.data);
    }

    @UseGuards(JwtAuthGuard)
    @ApiParam({ name: 'chat_id', required: true })
    @Patch('/:chat_id/name')
    async updateChatName(@Res() res, @Req() req, @Param() param, @Body() body: ChatNameDTO) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        const chat = await this.chatsService.updateChatName(json.id, param.chat_id, body.name);
        res.status(chat.status).json(chat.data);
    }

    @UseGuards(JwtAuthGuard)
    @ApiParam({ name: 'chat_id', required: true })
    @Patch('/:chat_id/avatar')
    async updateChatAvatar(@Res() res, @Req() req, @Param() param, @Body() body: ChatAvatarDTO) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        const chat = await this.chatsService.updateChatAvatar(json.id, param.chat_id, body.avatar);
        res.status(chat.status).json(chat.data);
    }

    @UseGuards(JwtAuthGuard)
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
    @ApiParam({ name: 'chat_id', required: true })
    @Get('/:chat_id/messages')
    async getMessages(
        @Res() res,
        @Req() req,
        @Param() param,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 20,
    ) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        const messages = await this.chatsService.getMessages(json.id, param.chat_id, {page, limit});
        res.status(messages.status).json(messages.data);
    }

    @UseGuards(JwtAuthGuard)
    @Post('/')
    async createChat(@Res() res, @Req() req, @Body() body: ChatDTO) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        const chatUsers = body.users;
        if (!body.users.includes(json.id)) chatUsers.push(json.id);
        const chat = await this.chatsService.createChat(body);
        if (chat?.status === 201) {
            this.chatsGateway.handleEmitNewChat(chat?.data?.data || []);
        }
        res.status(chat.status).json(chat.data);
    }

    @UseGuards(JwtAuthGuard)
    @ApiParam({ name: 'chat_id', required: true })
    @Delete('/:chat_id')
    async deleteChat(@Res() res, @Req() req, @Param() params) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        const result =  await this.chatsService.deleteChat(json.id, params.chat_id);
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

    @UseGuards(JwtAuthGuard)
    @Post('/test_push/')
    async createPush(@Res() res, @Req() req, @Body() body: MessageDTO, @Param() param) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        const message = await this.chatsService.createPush(param.chat_id, Number(json.id), body);
        res.status(200).json(message.data);
    }

    @Patch(':chat_id/add-user/')
    @ApiParam({ name: 'chat_id', required: true })
    async addUserToChat(@Res() res, @Req() req, @Param() params,  @Body() users: number[]) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };

        const chat = await this.chatsService.addUserToChat(json.id, users, params.chat_id);
        res.status(chat.status).json(chat.data);
    }
}
