import { IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatDTO {
    @IsString()
    @ApiProperty()
    name: string;
    @ApiProperty()
    @IsArray()
    users: number[];
}
