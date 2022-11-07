import { IsArray } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ForwardMessageDTO {
  @ApiProperty()
  @IsArray()
  messages: number[];
}
