import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDTO {
    @IsString()
    @ApiProperty()
    access_token: string;
    @IsString()
    @ApiProperty()
    refresh_token: string;
}
