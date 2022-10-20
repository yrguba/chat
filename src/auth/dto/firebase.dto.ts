import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class FirebaseDto {
  @IsString()
  @ApiProperty()
  firebase_token: string;
}
