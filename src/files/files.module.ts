import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { MulterModule } from '@nestjs/platform-express';
import {ServeStaticModule} from "@nestjs/serve-static";
import {join} from "path";

@Module({
    imports: [MulterModule.register({
        dest: './files',
    }),
    // ServeStaticModule.forRoot({
    //     rootPath: join(__dirname, '..', 'storage'),
    //     exclude: ['/api*'],
    // }),
    ],
    controllers: [FilesController],
})
export class FilesModule {}
