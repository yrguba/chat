import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegDTO {
  @IsString()
  @ApiProperty()
  email: string;
  @IsString()
  @ApiProperty()
  password: string;
  @IsString()
  @ApiProperty()
  name: string;
}
