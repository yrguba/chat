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
  ParseIntPipe,
  Delete,
} from "@nestjs/common";
import { ChatsService } from "./chats.service";
import { ChatsGateway } from "./chats.gateway";
import { ApiTags, ApiParam, ApiQuery } from "@nestjs/swagger";
import { ChatDTO } from "./dto/chat.dto";
import { ChatNameDTO } from "./dto/chatName.dto";
import { ChatAvatarDTO } from "./dto/chatAvatar.dto";
import { MessageDTO } from "./dto/message.dto";
import { JwtAuthGuard } from "../auth/strategy/jwt-auth.guard";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { UpdateMessageDto } from "./dto/updateMessage.dto";
import { DeleteMessageDto } from "./dto/deleteMessage.dto";
import { ForwardMessageDTO } from "./dto/forwardMessage.dto";
import { messageStatuses } from "./constants";

@ApiTags("Chats")
@Controller("chats")
export class ChatsController {
  constructor(
    private chatsService: ChatsService,
    private usersService: UsersService,
    private readonly jwtService: JwtService,
    private chatsGateway: ChatsGateway
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get("/")
  @ApiQuery({
    name: "page",
    description: "Текущая страница",
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: "limit",
    description: "Количество записей на странице",
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: "like",
    description: "Поиск по имени чата",
    required: false,
    //type: String,
  })
  async getChats(
    @Res() res,
    @Req() req,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit = 10,
    @Query("like", new DefaultValuePipe("")) like = ""
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const chats = await this.chatsService.getChats(userId, {
      page,
      limit,
      like,
    });
    res.status(chats.status).json(chats.data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "chat_id", required: true })
  @Get("/:chat_id")
  async getChat(@Res() res, @Req() req, @Param() param) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const chat = await this.chatsService.getChat(userId, param.chat_id);
    res.status(chat.status).json(chat.data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "user_id", required: true })
  @Get("/chat/with-user/:user_id")
  async getChatWithUser(@Res() res, @Req() req, @Param() param) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const chat = await this.chatsService.getChatWithUser(userId, param.user_id);
    res.status(chat.status).json(chat.data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "chat_id", required: true })
  @Patch("/:chat_id/name")
  async updateChatName(
    @Res() res,
    @Req() req,
    @Param() param,
    @Body() body: ChatNameDTO
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const chat = await this.chatsService.updateChatName(
      userId,
      param.chat_id,
      body.name
    );
    if (chat.status === 200) {
      this.chatsGateway.handleEmitNewMessage({
        chat_id: param.chat_id,
        ...chat.data.message,
      });
    }
    res.status(chat.status).json(chat.data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "chat_id", required: true })
  @Patch("/:chat_id/avatar")
  async updateChatAvatar(
    @Res() res,
    @Req() req,
    @Param() param,
    @Body() body: ChatAvatarDTO
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const chat = await this.chatsService.updateChatAvatar(
      userId,
      param.chat_id,
      body.avatar
    );
    if (chat.status === 200) {
      this.chatsGateway.handleEmitNewMessage({
        chat_id: param.chat_id,
        ...chat.data.message,
      });
    }
    res.status(chat.status).json(chat.data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiQuery({
    name: "page",
    description: "Текущая страница",
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: "limit",
    description: "Количество записей на странице",
    required: false,
    type: Number,
  })
  @ApiParam({ name: "chat_id", required: true })
  @Get("/:chat_id/messages")
  async getMessages(
    @Res() res,
    @Req() req,
    @Param() param,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit = 20
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const messages = await this.chatsService.getMessages(
      userId,
      param.chat_id,
      { page, limit }
    );
    if (messages.status === 200) {
      const updatedMessages = [];
      for (const message of messages.data.data) {
        if (
          message.user.id !== userId &&
          message.message_status !== messageStatuses.read
        ) {
          await this.chatsService.updateMessageStatus(
            param.chat_id,
            message.id,
            messageStatuses.read
          );
          updatedMessages.push(message.id);
        }
      }

      if (updatedMessages.length > 0) {
        this.chatsGateway.handleChangeMessageStatus({
          chat_id: param.chat_id,
          status: messageStatuses.read,
          messages: updatedMessages,
          ...messages.data.chat,
        });
      }
    }
    res.status(messages.status).json(messages.data);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/")
  async createChat(@Res() res, @Req() req, @Body() body: ChatDTO) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const chatUsers = body.users;
    if (!body.users.includes(userId)) chatUsers.push(userId);
    const chat = await this.chatsService.createChat(userId, body);
    if (chat?.status === 201) {
      if (chat.data.data.message.length > 0) {
        this.chatsGateway.handleEmitNewMessage({
          chat_id: chat?.data?.data.chat_id,
          ...chat.data.data.message,
        });
      }
      if (chat?.data?.data) {
        this.chatsGateway.handleEmitNewChat(chat?.data?.data || []);
      }
    }
    res.status(chat.status).json(chat.data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "chat_id", required: true })
  @Delete("/:chat_id")
  async deleteChat(@Res() res, @Req() req, @Param() params) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const result = await this.chatsService.deleteChat(userId, params.chat_id);
    res.status(200).json({ data: result });
  }

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "chat_id", required: true })
  @Post("/message/:chat_id")
  async createMessage(
    @Res() res,
    @Req() req,
    @Body() body: MessageDTO,
    @Param() param
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const message = await this.chatsService.createMessage(
      param.chat_id,
      Number(userId),
      body
    );
    if (message?.status === 201) {
      this.chatsGateway.handleEmitNewMessage({
        chat_id: param.chat_id,
        ...message,
      });

      this.chatsService
        .updateMessageStatus(param.chat_id, message.id)
        .then(() => {
          this.chatsGateway.handleChangeMessageStatus({
            chat_id: param.chat_id,
            status: messageStatuses.pending,
            messages: [message.id],
            ...message,
          });
        });
    }
    res.status(message.status).json(message.data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "chat_id", required: true })
  @ApiParam({ name: "message_id", required: true })
  @Post("/forward/message/:chat_id/")
  async forwardMessage(
    @Res() res,
    @Req() req,
    @Body() body: ForwardMessageDTO,
    @Param() param
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const message = await this.chatsService.forwardMessage(
      param.chat_id,
      Number(userId),
      body
    );
    if (message?.status === 200) {
      this.chatsGateway.handleEmitNewMessage({
        chat_id: param.chat_id,
        ...message,
      });
    }
    res.status(message.status).json(message.data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "chat_id", required: true })
  @ApiParam({ name: "message_id", required: true })
  @Post("/reply/message/:chat_id/:message_id")
  async replyMessage(
    @Res() res,
    @Req() req,
    @Body() body: MessageDTO,
    @Param() param
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const message = await this.chatsService.replyMessage(
      param.chat_id,
      param.message_id,
      Number(userId),
      body
    );
    if (message?.status === 201) {
      this.chatsGateway.handleEmitNewMessage({
        chat_id: param.chat_id,
        ...message,
      });
    }
    res.status(message.status).json(message.data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "chat_id", required: true })
  @ApiParam({ name: "message_id", required: true })
  @Patch("/message/:chat_id/:message_id")
  async updateMessageText(
    @Res() res,
    @Req() req,
    @Body() body: UpdateMessageDto,
    @Param() param
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const message = await this.chatsService.updateMessage(
      param.chat_id,
      param.message_id,
      Number(userId),
      body
    );
    if (message?.status === 200) {
      this.chatsGateway.handleEmitNewMessage({
        chat_id: param.chat_id,
        ...message,
      });
    }
    res.status(message.status).json(message.data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "chat_id", required: true })
  @Delete("/message/:chat_id")
  async deleteMessage(
    @Res() res,
    @Req() req,
    @Param() params,
    @Body() body: DeleteMessageDto
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const result = await this.chatsService.deleteMessage(
      userId,
      params.chat_id,
      body
    );
    if (result.data.data.messages && result.data.data.messages.length > 0) {
      this.chatsGateway.handleEmitDeleteMessage(result.data.data);
    }

    res.status(200).json({ data: result });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/test_push/")
  async createPush(
    @Res() res,
    @Req() req,
    @Body() body: MessageDTO,
    @Param() param
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const message = await this.chatsService.createPush(
      param.chat_id,
      Number(userId)
    );
    res.status(200).json(message.data);
  }

  @Patch(":chat_id/add-user/")
  @ApiParam({ name: "chat_id", required: true })
  async addUserToChat(
    @Res() res,
    @Req() req,
    @Param() params,
    @Body() users: number[]
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const chat = await this.chatsService.addUserToChat(
      userId,
      users,
      params.chat_id
    );

    if (chat?.status === 200) {
      this.chatsGateway.handleEmitNewMessage({
        chat_id: params.chat_id,
        ...chat.data.message,
      });
      this.chatsGateway.handleEmitAddToChat(chat?.data?.data || []);
    }
    res.status(chat.status).json(chat.data);
  }

  @Patch(":chat_id/remove-user/")
  @ApiParam({ name: "chat_id", required: true })
  async removeUserFromChat(
    @Res() res,
    @Req() req,
    @Param() params,
    @Body() users: number[]
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);

    const chat = await this.chatsService.removeUserFromChat(
      userId,
      users,
      params.chat_id
    );
    if (chat?.status === 200) {
      this.chatsGateway.handleEmitNewMessage({
        chat_id: params.chat_id,
        ...chat.data.message,
      });
      this.chatsGateway.handleEmitDeleteFromChat(chat?.data?.data || []);
    }
    res.status(chat.status).json(chat.data);
  }
}
