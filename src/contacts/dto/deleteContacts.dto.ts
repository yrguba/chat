import { ApiProperty } from "@nestjs/swagger";

export class DeleteContactsDto {
  contacts: number[];
}

export class DeleteContactsDtoV2 {
  phone: string;
}

export class ChangeContactName {
  @ApiProperty()
  name: string;
  @ApiProperty()
  phone: string;
}
