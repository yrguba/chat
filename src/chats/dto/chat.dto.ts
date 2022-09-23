import {IsString, IsArray, IsBoolean} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatDTO {
    id: number;
    @IsString()
    @ApiProperty()
    name: string;
    @ApiProperty()
    @IsArray()
    users: number[];
    @ApiProperty()
    @IsBoolean()
    is_group: boolean;
    updated_at: Date;
    avatar: string;
}
