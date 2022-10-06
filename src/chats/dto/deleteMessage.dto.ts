import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteMessageDto {
  @IsBoolean()
  @ApiProperty()
  fromAll: boolean;
}
