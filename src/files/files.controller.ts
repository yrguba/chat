import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { editFileName, imageFileFilter } from '../utils/file-upload.utils';
import {ApiBody, ApiConsumes, ApiTags} from "@nestjs/swagger";
import {JwtAuthGuard} from "../auth/strategy/jwt-auth.guard";

@ApiTags('files')
@Controller('files')
export class FilesController {
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

    // @Post('multiple')
    // @UseInterceptors(
    //     FilesInterceptor('image', 20, {
    //         storage: diskStorage({
    //             destination: './files',
    //             filename: editFileName,
    //         }),
    //         fileFilter: imageFileFilter,
    //     }),
    // )
    // async uploadMultipleFiles(@UploadedFiles() files) {
    //     const response = [];
    //     files.forEach(file => {
    //         const fileReponse = {
    //             originalname: file.originalname,
    //             filename: file.filename,
    //         };
    //         response.push(fileReponse);
    //     });
    //     return response;
    // }
}
