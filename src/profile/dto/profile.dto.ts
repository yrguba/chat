import { IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProfileDTO {
  @IsString()
  @ApiProperty()
  name: string;
  @IsString()
  @ApiProperty()
  login: string;
  @IsEmail()
  @ApiProperty()
  email: string;
  @IsString()
  @ApiProperty()
  birth: string;
  @IsString()
  @ApiProperty()
  player_id: string;
}
