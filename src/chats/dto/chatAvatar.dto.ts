import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChatAvatarDTO {
  @IsString()
  @ApiProperty()
  avatar: string;
}
