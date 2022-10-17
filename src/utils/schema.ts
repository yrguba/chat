import { messageStatuses } from "../chats/constants";

export const getUserSchema = (userData) => {
    return {
        id: userData.id || "",
        phone: userData.phone || "",
        name: userData.name || "",
        nickname: userData.nickname || "",
        email: userData.email || "",
        birth: userData.birth || "",
        avatar: userData.avatar || "",
        contactName: userData.contactName || "",
        last_active: userData.last_active || "",
        is_online: userData.is_online || false,
    }
};

export const getMessageSchema = (messageData) => {
    return {
        id: messageData.id || "",
        initiator_id: messageData.initiator_id || "",
        text: messageData.text || "",
        message_type: messageData.message_type || "",
        created_at: messageData.created_at || "",
        author: messageData.author || null,
        user: messageData.user || null,
        is_edited: messageData.is_edited || false,
        replyMessage: messageData.replyMessage || null,
        message_status: messageData.message_status || messageStatuses.sent,
    }
};
