import { IsInt, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { UserEntity } from "../../database/entities/user.entity";

export class GetAvatarsProfileDtoParam {
  @IsOptional()
  @IsInt({ message: "chatId must be number" })
  @Transform(({ value }) => Number(value))
  user_id: number;
}

export class DeleteAvatarsProfileDtoBody {
  @ApiProperty()
  @IsString({ message: "avatar must be string" })
  avatar: string;
}
