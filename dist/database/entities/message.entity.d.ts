import { ChatsEntity } from "./chats.entity";
export declare class MessageEntity {
    id: number;
    initiator_id: number;
    text: string;
    message_type: string;
    created_at: Date;
    chat: ChatsEntity;
}
