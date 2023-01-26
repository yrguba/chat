import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ChatsService } from "../chats/chats.service";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import { ChatsGateway } from "../chats/chats.gateway";
import {
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/strategy/jwt-auth.guard";
import { MessageDTO } from "./dto/message.dto";
import { ForwardMessageDTO } from "./dto/forwardMessage.dto";
import { UpdateMessageDto } from "./dto/updateMessage.dto";
import { DeleteMessageDto } from "./dto/deleteMessage.dto";
import { MessagesGateway } from "./messages.gateway";
import { MessagesService } from "./messages.service";
import {
  ReactionToMessageDTOBody,
  ReactionToMessageDTOParams,
} from "./dto/reactionToMessage.dto";
import { FileDTO } from "../files/dto/file.dto";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { messageFileFilter } from "../utils/file-upload.utils";

@ApiTags("Messages")
@Controller("chats")
export class MessagesController {
  constructor(
    private chatsService: ChatsService,
    private usersService: UsersService,
    private readonly jwtService: JwtService,
    private chatsGateway: ChatsGateway,
    private messagesGateway: MessagesGateway,
    private messagesService: MessagesService
  ) {}
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
    const messages = await this.messagesService.getMessages(
      userId,
      param.chat_id,
      { page, limit }
    );
    res.status(messages.status).json(messages.data);
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
    const message = await this.messagesService.createMessage(
      param.chat_id,
      Number(userId),
      body,
      null,
      null,
      req.headers
    );

    if (message?.status === 201) {
      this.messagesGateway.handleEmitNewMessage({
        chat_id: param.chat_id,
        ...message,
      });
    }
    res.status(message.status).json(message.data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "создать сообщение с файлом" })
  @ApiParam({ name: "chat_id", required: true })
  @ApiConsumes("multipart/form-data")
  @Post(":chat_id/file_message")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "images", maxCount: 10 },
        { name: "audios", maxCount: 10 },
        { name: "videos", maxCount: 10 },
        { name: "documents", maxCount: 10 },
        { name: "voices", maxCount: 1 },
      ],
      { fileFilter: messageFileFilter }
    )
  )
  async createFileMessage(
    @UploadedFiles() files,
    @Res() res,
    @Req() req,
    @Body() body: FileDTO,
    @Param() param
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const { filesName, type } = this.messagesService.saveMessageContent(
      param.chat_id,
      files
    );

    console.log("CONTROLLER FILE NAME");
    console.log(filesName);
    const messageData = { text: "", message_type: type };
    const message = await this.messagesService.createMessage(
      param.chat_id,
      Number(userId),
      messageData,
      null,
      filesName,
      req.headers
    );

    if (message?.status === 201) {
      this.messagesGateway.handleEmitNewMessage({
        chat_id: param.chat_id,
        ...message,
      });
    }
    res.status(message.status).json(message.data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "chat_id", required: true })
  @Post("/forward/message/:chat_id/")
  async forwardMessage(
    @Res() res,
    @Req() req,
    @Body() body: ForwardMessageDTO,
    @Param() param
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const message = await this.messagesService.forwardMessage(
      param.chat_id,
      Number(userId),
      body
    );
    if (message?.status === 200) {
      this.messagesGateway.handleEmitForwardMessage({
        chat_id: param.chat_id,
        data: message.data.data,
        users: message.users,
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
    const message = await this.messagesService.replyMessage(
      param.chat_id,
      param.message_id,
      Number(userId),
      body,
      req.headers
    );
    if (message?.status === 201) {
      this.messagesGateway.handleEmitNewMessage({
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
    const message = await this.messagesService.updateMessage(
      param.chat_id,
      param.message_id,
      Number(userId),
      body
    );
    if (message?.status === 200) {
      this.messagesGateway.handleEmitNewMessage({
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
    const result = await this.messagesService.deleteMessage(
      userId,
      params.chat_id,
      body
    );
    if (result.data.data.messages && result.data.data.messages.length > 0) {
      this.messagesGateway.handleEmitDeleteMessage(result.data.data);
    }

    res.status(200).json({ data: result });
  }

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "chat_id", required: true })
  @ApiParam({ name: "message_id", required: true })
  @Post("/:chat_id/message/:message_id/reaction")
  async reactionToMessage(
    @Res() res,
    @Req() req,
    @Param() params: ReactionToMessageDTOParams,
    @Body() body: ReactionToMessageDTOBody
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const result = await this.messagesService.reactionToMessage(
      params.chat_id,
      params.message_id,
      Number(userId),
      body
    );
    await this.messagesGateway.handleUpdReactionsMessage(result);
    res.status(200).json({ data: result.data });
  }
}
