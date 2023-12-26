import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Get,
  Res,
  Req,
  Param,
  Body,
  UploadedFiles,
  Delete,
} from "@nestjs/common";
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from "@nestjs/platform-express";
import { diskStorage } from "multer";
import {
  appFileFilter,
  documentTypeCheck,
  editFileName,
  imageFileFilter,
  privacyPolicyFileFilter,
  portableVersionFileFilter,
} from "../utils/file-upload.utils";
import { ApiBody, ApiConsumes, ApiParam, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/strategy/jwt-auth.guard";
import { FilesService } from "./files.service";

@ApiTags("files")
@Controller("files")
export class FilesController {
  constructor(private filesService: FilesService) {}

  @UseGuards(JwtAuthGuard)
  @Post("upload")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./storage",
        filename: editFileName,
      }),
      fileFilter: imageFileFilter,
    })
  )
  async uploadedFile(@UploadedFile() file) {
    return {
      data: {
        filename: file.filename,
        pathToFile: `/storage/${file.filename}`,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "version", required: true })
  @Post("upload/apk/:version")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./storage",
        filename: editFileName,
      }),
      fileFilter: appFileFilter,
    })
  )
  async uploadedApkFile(@UploadedFile() file, @Param() param) {
    const newVersion = await this.filesService.saveApp(
      param.version,
      `/app/${file.filename}`
    );
    return {
      data: {
        filename: file.filename,
        pathToFile: `/app/${file.filename}`,
        version: newVersion.version,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "version", required: true })
  @Get("get/apk/:version")
  async getLastVersion(@Res() res, @Req() req, @Param() param) {
    const version = await this.filesService.getLastApp(param.version);
    res.status(version.status).json(version.data);
  }

  // @UseGuards(JwtAuthGuard)
  @Post("upload/privacy_policy")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./storage",
        filename: (req, file, callback) => {
          callback(null, "PrivacyPolicy.html");
        },
      }),
      fileFilter: privacyPolicyFileFilter,
    })
  )
  async privacyPolicy(@UploadedFile() file, @Res() res) {
    res.status(200).json("success");
  }

  @UseInterceptors(FileFieldsInterceptor([{ name: "file", maxCount: 10 }], {}))
  @Post("upload_desktop_release")
  async uploadTauriRelease(
    @Res() res,
    @Req() req,
    @Body() body,
    @UploadedFiles() files
  ) {
    const result = await this.filesService.uploadTauriRelease(files, body);
    res.status(result).json();
  }

  @Post("upload_portable_version")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./files",
        filename: (req, file, callback) => {
          callback(null, "confee_portable.exe");
        },
      }),
      fileFilter: portableVersionFileFilter,
    })
  )
  async uploadPortableVersion(
    @Res() res,
    @Req() req,
    @Body() body,
    @UploadedFile() file
  ) {
    const result = await this.filesService.uploadPortableVersion();
    res.status(result).json();
  }

  @Get("get_latest_desktop_release/:platform/:version")
  async getLatestDesktopRelease(
    @Res() res,
    @Req() req,
    @Body() body,
    @Param() param
  ) {
    const result = await this.filesService.getLatestDesktopRelease(param, req);
    res.status(result.status).json(result.data);
  }

  @Get("portable_version")
  async getPortableVersion(
    @Res() res,
    @Req() req,
    @Body() body,
    @Param() param
  ) {
    const result = await this.filesService.getPortableVersion();
    res.status(result.status).json(result.data);
  }

  @Delete("delete_desktop_releases")
  async deleteDesktopRelease(
    @Res() res,
    @Req() req,
    @Body() body,
    @Param() param
  ) {
    const result = await this.filesService.deleteDesktopRelease();
    res.status(result.status).json({});
  }
}
