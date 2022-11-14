import {
  Body,
  Controller,
  Get,
  Patch,
  Res,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Param,
  Delete,
} from "@nestjs/common";
import { ProfileService } from "./profile.service";
import {
  ApiConsumes,
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiParam,
} from "@nestjs/swagger";
import { ProfileEmptyDTO } from "./dto/profile.empty.dto";
import { JwtAuthGuard } from "../auth/strategy/jwt-auth.guard";
import { JwtService } from "@nestjs/jwt";
import { FileInterceptor } from "@nestjs/platform-express";
import { FilesService } from "../files/files.service";
import { UsersService } from "../users/users.service";
import { FilePathsDirective } from "../files/constanst/paths";
import { imageFileFilter } from "../utils/file-upload.utils";
import { FileDTO, getFilesDTO } from "../files/dto/file.dto";
import {
  DeleteAvatarsProfileDtoBody,
  GetAvatarsProfileDtoParam,
} from "./dto/profileAvatar";

@ApiTags("profile")
@Controller("profile")
export class ProfileController {
  constructor(
    private profileService: ProfileService,
    private fileService: FilesService,
    private usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get("/")
  async getUser(@Res() res, @Req() req) {
    const jwt = req.headers.authorization.replace("Bearer ", "");
    const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
    const profile = await this.profileService.getProfile(json.id);
    res.status(profile.status).json(profile.data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("/")
  async updateUser(@Res() res, @Req() req, @Body() body: ProfileEmptyDTO) {
    const jwt = req.headers.authorization.replace("Bearer ", "");
    const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
    const profile = await this.profileService.updateProfile(json.id, body);
    res.status(profile.status).json(profile.data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("/avatar")
  @ApiOperation({ summary: "изменить аватар профиля" })
  @ApiResponse({
    status: 200,
    type: ProfileEmptyDTO,
  })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("images", { fileFilter: imageFileFilter }))
  async updateAvatar(
    @UploadedFile() file,
    @Res() res,
    @Req() req,
    @Body() body: FileDTO
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const fileName = this.fileService.createFile(
      file,
      FilePathsDirective.USER_AVATAR,
      userId
    );
    const profile = await this.profileService.updateProfile(userId, {
      avatar: fileName,
    } as ProfileEmptyDTO);
    res.status(profile.status).json(profile.data);
  }

  @UseGuards(JwtAuthGuard)
  @Get("/:user_id/avatars")
  @ApiOperation({ summary: "получить все аватарки профиля" })
  @ApiParam({ name: "user_id", required: true })
  @ApiResponse({
    status: 200,
    type: getFilesDTO,
  })
  async getAvatars(
    @UploadedFile() file,
    @Res() res,
    @Req() req,
    @Param() param: GetAvatarsProfileDtoParam
  ) {
    const result = this.fileService.getFiles(
      FilePathsDirective.USER_AVATAR,
      param.user_id
    );
    res.status(result.status).json(result.data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("avatar")
  @ApiOperation({ summary: "удалить аватар профиля" })
  async deleteAvatar(
    @Res() res,
    @Req() req,
    @Body() body: DeleteAvatarsProfileDtoBody
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const result = await this.profileService.deleteAvatar(userId, body.avatar);
    res.status(result.status).json(result.data);
  }
}
