import {
    Controller,
    Get,
    Res,
    Req,
    Body,
    UseGuards,
    Param,
    Post, Delete
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import {ApiParam, ApiTags} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategy/jwt-auth.guard';
import { JwtService } from "@nestjs/jwt";
import {ContactDTO} from "./dto/contact.dto";
import {DeleteContactsDto} from "./dto/deleteContacts.dto";
import {UsersService} from "../users/users.service";

@ApiTags('contacts')
@Controller('contacts')
export class ContactsController {
    constructor(
        private contactsService: ContactsService,
        private usersService: UsersService,
        private readonly jwtService: JwtService,
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get('/')
    async getContacts(@Res() res, @Req() req) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };

        const contacts = await this.contactsService.getContacts(json.id);
        res.status(contacts.status).json(contacts.data);
    }

    @UseGuards(JwtAuthGuard)
    @ApiParam({ name: 'contact_id', required: true })
    @Get('/:contact_id')
    async getContact(@Res() res, @Req() req, @Param() param) {
        const contact = await this.contactsService.getContact(param.contact_id);
        res.status(contact.status).json(contact.data);
    }

    @UseGuards(JwtAuthGuard)
    @Post('/')
    async saveContacts(@Res() res, @Req() req, @Body() body: ContactDTO[]) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        const owner = await this.usersService.getUserWithContacts(json.id);

        const newContacts = body.filter(contact => {
            const index = owner.contact.some(ownerContact => ownerContact.phone === contact.phone);
            console.log(index);

            return !index;
        });
        //console.log(owner.contact)
        // console.log(body);
        console.log(owner.contact);
        console.log(newContacts);
        this.contactsService.saveContact(json.id, newContacts);

        res.status(200).json({data: body});
    }

    @UseGuards(JwtAuthGuard)
    @Delete('/')
    async deleteContacts(@Res() res, @Req() req, @Body() body: DeleteContactsDto) {
        body?.contacts.map((id: any) => {
            this.contactsService.deleteContact(id);
        });

        res.status(200).json({data: body});
    }
}
