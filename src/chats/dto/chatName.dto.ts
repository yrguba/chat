import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChatNameDTO {
  @IsString()
  @ApiProperty()
  name: string;
}
