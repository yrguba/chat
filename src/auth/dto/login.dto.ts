import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDTO {
  @IsString()
  @ApiProperty()
  phone: string;
  @IsString()
  @ApiProperty()
  code: string;
}
