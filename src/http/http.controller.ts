import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  Query,
  UseGuards,
  Version,
  Patch,
  UseInterceptors,
  UploadedFile,
  Body,
} from "@nestjs/common";
import {
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import fetch from "node-fetch";
import { JwtAuthGuard } from "../auth/strategy/jwt-auth.guard";
import {
  ChatAvatarDTOParam,
  UpdateChatAvatarDTOResponse,
} from "../chats/dto/chatAvatar.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { imageFileFilter } from "../utils/file-upload.utils";
import { FileDTO } from "../files/dto/file.dto";
import { FilePathsDirective } from "../files/constanst/paths";
import * as urlMetadata from "url-metadata";
import axios from "axios";

@ApiTags("Http")
@Controller("http")
export class HttpController {
  @ApiParam({ name: "lat", required: true })
  @ApiParam({ name: "lon", required: true })
  @Get("weather?")
  async getChat(@Res() res, @Req() req, @Param() param, @Query() query) {
    const response = await fetch(
      `https://api.weather.yandex.ru/v2/informers??lat=${query.lat}&lon=${query.lon}&[lang=ru_RU]`,
      {
        headers: {
          "X-Yandex-API-Key": process.env.YANDEX_WEATHER_KEY,
        },
      }
    );
    const data = await response.json();
    res.status(response.status).json(data);
  }

  @Get("link-preview?")
  async getLinkPreview(@Res() res, @Req() req, @Param() param, @Query() query) {
    try {
      const metadata: any = await urlMetadata(query.link, {
        mode: "same-origin",
        includeResponseBody: true,
      });

      const favicon = metadata?.favicons?.pop() || {};

      const ogObj: any = {};
      let binaryFavicon: any = null;

      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          if (key.split(":")[0] === "og") {
            ogObj[`${key}`] = value;
          }
        });
        if (favicon.href) {
          const faviconRes = await axios.get(favicon.href);
          binaryFavicon = faviconRes.data;
        }
      }

      const data = {
        url: query.link || "",
        title: metadata.title || "",
        favicon: favicon,
        description: metadata.description || "",
        keywords: metadata.keywords || "",
        previewImg: metadata["twitter:image"],
        binaryFavicon,
        og: ogObj,
      };

      res.status(200).json(data);
    } catch (e) {
      res.status(500).json("no meta");
    }
  }
}
