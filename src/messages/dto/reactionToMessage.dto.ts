import { IsInt, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";

export class ReactionToMessageDTOParams {
  @IsOptional()
  @IsInt({ message: "chatId must be number" })
  @Transform(({ value }) => Number(value))
  chat_id: number;
  @IsOptional()
  @IsInt({ message: "chatId must be number" })
  @Transform(({ value }) => Number(value))
  message_id: number;
}

export class ReactionToMessageDTOBody {
  @ApiProperty()
  @IsString({ message: "reaction must be string" })
  reaction: string;
}
