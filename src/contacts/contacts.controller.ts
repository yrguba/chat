import {
  Controller,
  Get,
  Res,
  Req,
  Body,
  UseGuards,
  Param,
  Post,
  Delete,
  Version,
} from "@nestjs/common";
import { ContactsService } from "./contacts.service";
import { ApiParam, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/strategy/jwt-auth.guard";
import { JwtService } from "@nestjs/jwt";
import {
  ChangeContactName,
  DeleteContactsDto,
  DeleteContactsDtoV2,
} from "./dto/deleteContacts.dto";
import { UsersService } from "../users/users.service";
import { CreateContactsDto } from "./dto/createContacts.dto";
import { ChatsGateway } from "../chats/chats.gateway";

@ApiTags("contacts")
@Controller("contacts")
export class ContactsController {
  constructor(
    private contactsService: ContactsService,
    private usersService: UsersService,
    private readonly jwtService: JwtService,
    private chatsGateway: ChatsGateway
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get("/")
  async getContacts(@Res() res, @Req() req) {
    const jwt = req.headers.authorization.replace("Bearer ", "");
    const json = this.jwtService.decode(jwt, { json: true }) as { id: number };

    const contacts = await this.contactsService.getContacts(json.id);
    res.status(contacts.status).json(contacts.data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "contact_id", required: true })
  @Get("/:contact_id")
  async getContact(@Res() res, @Req() req, @Param() param) {
    const contact = await this.contactsService.getContact(param.contact_id);
    res.status(contact.status).json(contact.data);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/")
  async saveContacts(@Res() res, @Req() req, @Body() body: CreateContactsDto) {
    const jwt = req.headers.authorization.replace("Bearer ", "");
    const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
    const owner = await this.usersService.getUserWithContacts(json.id);

    const newContacts = body?.contacts.filter((contact) => {
      const index = owner.contact.some(
        (ownerContact) => ownerContact.phone === contact.phone
      );
      return !index;
    });

    await this.contactsService.saveContact(json.id, newContacts);

    res.status(200).json({ data: body });
  }

  @Version("2")
  @UseGuards(JwtAuthGuard)
  @Post("/")
  async saveContactsV2(
    @Res() res,
    @Req() req,
    @Body() body: CreateContactsDto
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    await this.contactsService.deleteAllContact(userId);
    await this.contactsService.saveContact(userId, body?.contacts);

    res.status(200).json({ data: body });
  }

  @UseGuards(JwtAuthGuard)
  @Delete("/")
  async deleteContacts(
    @Res() res,
    @Req() req,
    @Body() body: DeleteContactsDto
  ) {
    body?.contacts.map((id: any) => {
      this.contactsService.deleteContact(id);
    });

    res.status(200).json({ data: body });
  }

  @Version("2")
  @UseGuards(JwtAuthGuard)
  @Delete("/")
  async deleteContactsV2(
    @Res() res,
    @Req() req,
    @Body() body: DeleteContactsDtoV2
  ) {
    const result = await this.contactsService.deleteContactByPhone(body.phone);
    res.status(result.status).json(result.data);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/change-name")
  async changeContactName(
    @Res() res,
    @Req() req,
    @Body() body: ChangeContactName
  ) {
    const userId = await this.usersService.getUserIdFromToken(req);
    const result = await this.contactsService.changeContactName(userId, body);
    if (result.status === 200) {
      this.chatsGateway.handleUpdateChat(result.socketData);
    }
    res.status(result.status).json(result.data);
  }
}
