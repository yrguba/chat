import {
    Controller,
    Get,
    Res,
    Req,
    Body,
    UseGuards,
    Param,
    Post
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import {ApiParam, ApiTags} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategy/jwt-auth.guard';
import { JwtService } from "@nestjs/jwt";
import {ContactDTO} from "./dto/contact.dto";

@ApiTags('contacts')
@Controller('contacts')
export class ContactsController {
    constructor(
        private contactsService: ContactsService,
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
    @Post('/')
    async saveContacts(@Res() res, @Req() req, @Body() body: ContactDTO[]) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };

        body.map(contact => {
            this.contactsService.saveContact(json.id, contact);
        });

        res.status(200).json({data: body});
    }
}
