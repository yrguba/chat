import { Controller, Get, Param, Req, Res, Query } from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";
import fetch from "node-fetch";

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
}
