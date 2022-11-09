import { IsInt, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";

export class ChatFilesDtoParam {
  @IsOptional()
  @IsInt({ message: "chat_id must be number" })
  @Transform(({ value }) => Number(value))
  chat_id: number;
  @IsOptional()
  @IsString({ message: "content_type must be string" })
  file_type: string;
}
