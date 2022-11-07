import { IsArray, IsInt, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";

class SetReactionsDTOParams {
  @IsOptional()
  @IsInt({ message: "chatId must be number" })
  @Transform(({ value }) => Number(value))
  chat_id: number;
}

class SetReactionsDTOBody {
  @ApiProperty()
  @IsArray({ message: "reactions must be array" })
  reactions: string[];
}

export { SetReactionsDTOParams, SetReactionsDTOBody };
