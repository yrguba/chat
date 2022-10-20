import { IsArray, IsNumber } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ForwardMessageDTO {
  @ApiProperty()
  @IsNumber()
  author_id: number;
  @ApiProperty()
  @IsArray()
  messages: number[];
}
