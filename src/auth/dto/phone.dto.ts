import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PhoneDTO {
  @IsString()
  @ApiProperty()
  phone: string;
}
