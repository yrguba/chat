import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
  Delete,
  Param,
  Version,
  Headers,
  Get,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import { LoginDTO } from "./dto/login.dto";
import { RefreshDTO } from "./dto/refresh.dto";
import { ApiParam, ApiTags } from "@nestjs/swagger";
import { PhoneDTO } from "./dto/phone.dto";
import { FirebaseDto } from "./dto/firebase.dto";
import { JwtAuthGuard } from "./strategy/jwt-auth.guard";
import { OnesignalDto } from "./dto/onesignal.dto";

@ApiTags("Authorization")
@Controller("authorization")
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  @Post("send_code")
  async send_code(@Req() req, @Res() res, @Body() body: PhoneDTO) {
    const response = await this.authService.send_code(body.phone);
    res.status(response.status).json(response.data);
  }

  @Version("2")
  @Post("login")
  async loginV2(
    @Req() req,
    @Res() res,
    @Body() body: LoginDTO,
    @Headers() headers
  ) {
    const auth = await this.authService.loginV2(body, req.headers);
    res.status(auth.status).json(auth.data);
  }

  @Post("logout")
  async logout(@Req() req, @Res() res, @Headers() headers) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const result = await this.authService.logout(userId, headers);
    res.status(result.status).json(result.data);
  }

  @Version("2")
  @Post("refresh")
  async refreshTokensV2(
    @Res() res,
    @Req() req,
    @Body() body: RefreshDTO,
    @Headers() headers
  ) {
    const userId = await this.usersService.getUserIdFromRefreshToken(body.refresh_token);
    const tokens = await this.authService.refreshTokensV2(
      userId,
      body.refresh_token,
      headers
    );
    res.status(tokens.status).json(tokens.data);
  }

  @UseGuards(JwtAuthGuard)
  @Post("firebase_token")
  async createFirebaseToken(
    @Res() res,
    @Req() req,
    @Body() body: FirebaseDto,
    @Headers() headers
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const tokens = await this.authService.createNotificationToken(
      userId,
      body,
      headers
    );
    res.status(tokens.status).json(tokens.data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "firebase_token", required: true })
  @Delete("firebase_token/:firebase_token")
  async deleteFirebaseToken(@Res() res, @Req() req, @Param() param) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const tokens = await this.authService.deleteFirebaseToken(
      userId,
      param.firebase_token
    );
    res.status(tokens.status).json(tokens.data);
  }

  @UseGuards(JwtAuthGuard)
  @Post("onesignal_token")
  async createOneSignalPlayerId(
    @Res() res,
    @Req() req,
    @Body() body: OnesignalDto,
    @Headers() headers
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const result = await this.authService.createNotificationToken(
      userId,
      body,
      headers
    );
    res.status(result.status).json(result.data);
  }

  @UseGuards(JwtAuthGuard)
  @Get("sessions")
  async getSessions(@Res() res, @Req() req, @Param() param) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const result = await this.authService.getSessions(userId);
    res.status(result.status).json(result.data);
  }
}
