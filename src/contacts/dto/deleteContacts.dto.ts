export class DeleteContactsDto {
  contacts: number[];
}

export class DeleteContactsDtoV2 {
  phone: string;
}

export class ChangeContactName {
  name: string;
  phone: string;
}
