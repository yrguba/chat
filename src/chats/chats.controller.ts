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
  UseInterceptors,
  UploadedFile,
  Version,
} from "@nestjs/common";
import { ChatsService } from "./chats.service";
import { ChatsGateway } from "./chats.gateway";
import {
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from "@nestjs/swagger";
import { ChatDTO } from "./dto/chat.dto";
import { ChatNameDTO } from "./dto/chatName.dto";
import {
  ChatAvatarDTO,
  ChatAvatarDTOParam,
  UpdateChatAvatarDTOResponse,
} from "./dto/chatAvatar.dto";
import {
  SetReactionsDTOBody,
  SetReactionsDTOParams,
} from "./dto/setReactions.dto";
import { MessageDTO } from "../messages/dto/message.dto";
import { JwtAuthGuard } from "../auth/strategy/jwt-auth.guard";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { MessagesGateway } from "../messages/messages.gateway";
import { FileInterceptor } from "@nestjs/platform-express";
import { imageFileFilter } from "../utils/file-upload.utils";
import { FileDTO, getFilesDTO } from "../files/dto/file.dto";
import { FilePathsDirective } from "../files/constanst/paths";
import { FilesService } from "../files/files.service";
import { ChatFilesDtoParam } from "./dto/chatFiles.dto";

@ApiTags("Chats")
@Controller("chats")
export class ChatsController {
  constructor(
    private chatsService: ChatsService,
    private usersService: UsersService,
    private fileService: FilesService,
    private readonly jwtService: JwtService,
    private chatsGateway: ChatsGateway,
    private messagesGateway: MessagesGateway
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
  @Get("/allReactions")
  async getAllReactions(@Res() res) {
    const result = await this.chatsService.getAllReactions();
    res.status(result.status).json(result.data);
  }

  @UseGuards(JwtAuthGuard)
  @Get("/total_pending_messages")
  async getTotalPendingMessages(@Res() res, @Req() req) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const result = await this.chatsService.getTotalPendingMessages(userId);
    res.status(200).json(result.data);
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
      body.name,
      req.headers
    );
    if (chat.status === 200) {
      this.messagesGateway.handleEmitNewMessage({
        chat_id: param.chat_id,
        ...chat.data.message,
      });
      this.chatsGateway.handleUpdateChat(chat.socketData);
    }
    res.status(chat.status).json(chat.data);
  }

  @Version("1")
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
      body.avatar,
      req.headers
    );
    if (chat.status === 200) {
      this.messagesGateway.handleEmitNewMessage({
        chat_id: param.chat_id,
        ...chat.data.message,
      });
    }
    res.status(chat.status).json(chat.data);
  }

  @UseGuards(JwtAuthGuard)
  @Version("2")
  @Patch("/:chat_id/avatar")
  @ApiOperation({ summary: "изменить аватар чата" })
  @ApiResponse({ status: 200, type: UpdateChatAvatarDTOResponse })
  @ApiParam({ name: "chat_id", required: true })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("images", { fileFilter: imageFileFilter }))
  async updateAvatar(
    @UploadedFile() file,
    @Res() res,
    @Req() req,
    @Body() body: FileDTO,
    @Param() param: ChatAvatarDTOParam
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const fileName = this.fileService.createFile(
      file,
      FilePathsDirective.CHAT_AVATAR,
      param.chat_id
    );
    const result = await this.chatsService.updateAvatar(
      userId,
      Number(param.chat_id),
      fileName,
      req.headers
    );
    if (result.status === 200) {
      if (result?.message) {
        this.messagesGateway.handleEmitNewMessage({
          chat_id: param.chat_id,
          ...result.message,
        });
      }
      this.chatsGateway.handleUpdateChat(result.socketData);
    }
    res.status(result.status).json(result.data);
  }

  @UseGuards(JwtAuthGuard)
  @Get("/:chat_id/avatars")
  @ApiOperation({ summary: "получить все аватарки чата" })
  @ApiParam({ name: "chat_id", required: true })
  @ApiResponse({
    status: 200,
    type: getFilesDTO,
  })
  async getAvatars(
    @UploadedFile() file,
    @Res() res,
    @Req() req,
    @Param() param: ChatAvatarDTOParam
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const result = await this.chatsService.getAvatars(param.chat_id, userId);
    res.status(result.status).json(result.data);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/")
  async createChat(@Res() res, @Req() req, @Body() body: ChatDTO) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const chatUsers = body.users;
    if (body.users.length === 0) {
      res.status(403).json({
        data: {
          error: {
            message: "Can't create chat with empty users list",
          },
        },
      });
    }
    if (!body.users.includes(userId)) chatUsers.push(userId);
    const chat = await this.chatsService.createChat(userId, body, req.headers);
    if (chat?.status === 201) {
      if (chat.data.data.message.length > 0) {
        this.messagesGateway.handleEmitNewMessage({
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
    this.chatsGateway.handleDeleteChat(result.id, result.users);
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

  @UseGuards(JwtAuthGuard)
  @Patch(":chat_id/add-user/")
  @ApiParam({ name: "chat_id", required: true })
  async addUserToChat(@Res() res, @Req() req, @Param() params, @Body() body) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const chat = await this.chatsService.addUserToChat(
      userId,
      body.users,
      params.chat_id,
      req.headers
    );

    if (chat?.status === 200) {
      this.messagesGateway.handleEmitNewMessage({
        chat_id: params.chat_id,
        ...chat.data.message,
      });
      // this.chatsGateway.handleEmitAddToChat(chat.data.socketData || []);
      this.chatsGateway.handleUpdateChat(chat.data.socketData);
    }
    res.status(chat.status).json(chat.data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":chat_id/exit/")
  @ApiParam({ name: "chat_id", required: true })
  async exitFromChat(@Res() res, @Req() req, @Param() params) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const exitChat = await this.chatsService.exitFromChat(
      userId,
      params.chat_id,
      req.headers
    );
    res.status(exitChat.status).json(exitChat.data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":chat_id/remove-user/")
  @ApiParam({ name: "chat_id", required: true })
  async removeUserFromChat(
    @Res() res,
    @Req() req,
    @Param() params,
    @Body() body
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);

    const chat = await this.chatsService.removeUserFromChat(
      userId,
      body.users,
      params.chat_id,
      req.headers
    );
    if (chat?.status === 200) {
      this.messagesGateway.handleEmitNewMessage({
        chat_id: params.chat_id,
        ...chat.data.message,
      });
      this.chatsGateway.handleEmitDeleteFromChat(chat?.data?.data || []);
      this.chatsGateway.handleUpdateChat(chat.data.socketData);
      this.chatsGateway.handleDeleteChat(params.chat_id, body.users);
    }
    res.status(chat.status).json(chat.data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "chat_id", required: true })
  @Patch("/:chat_id/reactions")
  async setReactionsInChat(
    @Res() res,
    @Req() req,
    @Param() param: SetReactionsDTOParams,
    @Body() body: SetReactionsDTOBody
  ) {
    const result = await this.chatsService.setReactionsInChat(
      param.chat_id,
      body.reactions
    );
    if (result.status === 200) {
      this.chatsGateway.handleUpdateChat(result.socketData);
    }
    res.status(result.status).json(result.data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "получить файлы чата (images | videos | voices | audios)",
  })
  @ApiParam({ name: "chat_id", required: true })
  @ApiParam({
    name: "file_type",
    enum: ["images", "videos", "voices", "audios"],
    required: true,
  })
  @ApiResponse({
    status: 200,
    type: getFilesDTO,
  })
  @Get("/:chat_id/files/:file_type")
  async getFiles(@Res() res, @Param() param: ChatFilesDtoParam, @Req() req) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const result = await this.chatsService.getFiles(
      param.chat_id,
      userId,
      param.file_type
    );
    res.status(result.status).json(result.data);
  }
}
