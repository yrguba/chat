import { MessageEntity } from "./message.entity";
export declare class ChatsEntity {
    id: number;
    name: string;
    created_at: Date;
    users: number[];
    message: MessageEntity[];
}
