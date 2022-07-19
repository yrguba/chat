import { ApiProperty } from '@nestjs/swagger';

export class ProfileEmptyDTO {
  @ApiProperty()
  name: "";
  @ApiProperty()
  nickname: "";
  @ApiProperty()
  email: "";
  @ApiProperty()
  birth: "";
  @ApiProperty()
  avatar: "";
  @ApiProperty()
  player_id: "";
}
