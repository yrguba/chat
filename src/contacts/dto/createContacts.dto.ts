import { ApiProperty } from '@nestjs/swagger';
import { ContactDTO } from "./contact.dto";

export class CreateContactsDto {
    @ApiProperty()
    contacts: ContactDTO[]
}
