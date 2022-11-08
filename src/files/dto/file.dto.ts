import { ApiProperty } from "@nestjs/swagger";

export class FileDTO {
  @ApiProperty({ type: "string", format: "binary", required: true })
  file: Express.Multer.File;
}

export class getFilesDTO {
  @ApiProperty()
  files: string[];
}
