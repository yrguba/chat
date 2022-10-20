import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { MulterModule } from "@nestjs/platform-express";
import { FilesService } from "./files.service";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppEntity } from "../database/entities/app.entity";

import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    MulterModule.register({
      dest: "./files",
    }),
    // ServeStaticModule.forRoot({
    //     rootPath: join(__dirname, '..', 'storage'),
    //     exclude: ['/api*'],
    // }),
    TypeOrmModule.forFeature([AppEntity]),
    JwtModule,
  ],
  controllers: [FilesController],
  providers: [FilesService, AppEntity],
  exports: [FilesService],
})
export class FilesModule {}
