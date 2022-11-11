import { IsInt, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";

export class ChatAvatarDTO {
  @ApiProperty()
  @IsString()
  avatar: string;
}

export class UpdateChatAvatarDTOResponse {
  @ApiProperty({ example: 1487 })
  chat_id: number;
  @ApiProperty()
  avatar: string;
}

export class ChatAvatarDTOParam {
  @IsOptional()
  @IsInt({ message: "chat_id must be number" })
  @Transform(({ value }) => Number(value))
  chat_id: number;
}
