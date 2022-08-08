import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContactDTO {
    @IsString()
    @ApiProperty()
    name: string;
    @IsString()
    @ApiProperty()
    phone: string;
}
