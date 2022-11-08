import { IsInt } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class GetAvatarsProfileDtoBody {
  @ApiProperty({ example: 1487 })
  @IsInt({ message: "user_id must be number" })
  user_id: number;
}
