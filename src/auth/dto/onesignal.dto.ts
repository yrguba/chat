import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class OnesignalDto {
  @IsString()
  @ApiProperty()
  onesignal_player_id: string;
}
