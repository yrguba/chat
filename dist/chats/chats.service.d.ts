import { Repository } from 'typeorm';
import { ChatsEntity } from "../database/entities/chats.entity";
import { MessageEntity } from "../database/entities/message.entity";
import { ChatDTO } from "./dto/chat.dto";
export declare class ChatsService {
    private chatsRepository;
    private messageRepository;
    constructor(chatsRepository: Repository<ChatsEntity>, messageRepository: Repository<MessageEntity>);
    createChat(data: ChatDTO): Promise<ChatsEntity>;
    getChat(chat_id: number): Promise<ChatsEntity>;
    getChats(user_id: number): Promise<ChatsEntity[]>;
    addUserToChat(user_id: number, chat_id: number): Promise<ChatsEntity>;
    createMessage(chat_id: number, user_id: number, data: any): Promise<any>;
}
