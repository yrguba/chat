import { IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProfileDTO {
    @IsString()
    @ApiProperty()
    name: string;
    @IsString()
    @ApiProperty()
    nickname: string;
    @IsEmail()
    @ApiProperty()
    email: string;
    @IsString()
    @ApiProperty()
    birth: string;
    @IsString()
    @ApiProperty()
    avatar: string;
    @IsString()
    @ApiProperty()
    player_id: string;
    contactName: string;
}
