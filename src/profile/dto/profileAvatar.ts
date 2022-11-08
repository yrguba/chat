import { IsInt, IsOptional } from "class-validator";
import { Transform } from "class-transformer";

export class GetAvatarsProfileDtoParam {
  @IsOptional()
  @IsInt({ message: "chatId must be number" })
  @Transform(({ value }) => Number(value))
  user_id: number;
}
