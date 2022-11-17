import { Module } from "@nestjs/common";
import { HttpService } from "./http.service";
import { HttpController } from "./http.controller";

@Module({
  controllers: [HttpController],
  providers: [HttpService],
})
export class HttpModule {}
