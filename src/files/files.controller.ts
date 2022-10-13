import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    UseGuards, Get, Res, Req, Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { appFileFilter, editFileName, imageFileFilter } from '../utils/file-upload.utils';
import { ApiBody, ApiConsumes, ApiParam, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/strategy/jwt-auth.guard";
import { FilesService } from "./files.service";

@ApiTags('files')
@Controller('files')
export class FilesController {
    constructor(
      private filesService: FilesService,
    ) {}

    @UseGuards(JwtAuthGuard)
    @Post('upload')
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './storage',
                filename: editFileName,
            }),
            fileFilter: imageFileFilter,
        }),
    )
    async uploadedFile(@UploadedFile() file) {
        return {
            data: {
                filename: file.filename,
                pathToFile: `/storage/${file.filename}`,
            }
        };
    }

    @UseGuards(JwtAuthGuard)
    @ApiParam({ name: 'version', required: true })
    @Post('upload/apk/:version')
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(
      FileInterceptor('file', {
          storage: diskStorage({
              destination: './storage',
              filename: editFileName,
          }),
          fileFilter: appFileFilter,
      }),
    )

    async uploadedApkFile(@UploadedFile() file, @Param() param) {
        const newVersion = await this.filesService.saveApp(param.version, `/app/${file.filename}`);
        return {
            data: {
                filename: file.filename,
                pathToFile: `/app/${file.filename}`,
                version: newVersion.version,
            }
        };
    }

    @UseGuards(JwtAuthGuard)
    @ApiParam({ name: 'version', required: true })
    @Get('get/apk/:version')
    async getLastVersion(@Res() res, @Req() req, @Param() param) {
        const version = await this.filesService.getLastApp(param.version);
        res.status(version.status).json(version.data);
    }
}
