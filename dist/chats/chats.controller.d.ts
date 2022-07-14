import { ChatsService } from './chats.service';
import { ChatDTO } from './dto/chat.dto';
import { JwtService } from '@nestjs/jwt';
export declare class ChatsController {
    private chatsService;
    private readonly jwtService;
    constructor(chatsService: ChatsService, jwtService: JwtService);
    getChats(res: any, req: any): Promise<void>;
    getChat(res: any, req: any, param: any): Promise<void>;
    createChat(res: any, req: any, body: ChatDTO): Promise<void>;
}
