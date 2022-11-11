import { IsString, IsNumber } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ContactDTO {
  @IsNumber()
  id: number;
  @IsString()
  @ApiProperty()
  name: string;
  @IsString()
  @ApiProperty()
  phone: string;
}
