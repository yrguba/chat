import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateMessageDto {
  @IsString()
  @ApiProperty()
  text: string;
}
