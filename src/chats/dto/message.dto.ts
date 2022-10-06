import {IsNumber, IsString} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MessageDTO {
    @IsString()
    @ApiProperty()
    text: string;
    @ApiProperty()
    @IsString()
    message_type: string;
    @ApiProperty()
    @IsNumber()
    author_id: number;
    @ApiProperty()
    @IsNumber()
    reply_message_id: number;
}
