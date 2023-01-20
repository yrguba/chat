import { Injectable } from "@nestjs/common";
import * as OneSignal from "onesignal-node";

@Injectable()
export class NotificationsService {
  private client = new OneSignal.Client(
    process.env.ONE_SIGNAL_APP_ID,
    process.env.ONE_SIGNAL_REST_API_KEY
  );
  async newMessage(playerId: string, chat, message, initiator, contact) {
    console.log("os-app-id", process.env.ONE_SIGNAL_APP_ID);
    console.log("os-api-key", process.env.ONE_SIGNAL_REST_API_KEY);
    const notification = {
      headings: {
        en: chat.is_group
          ? String(chat.name)
          : contact?.name
          ? String(contact?.name)
          : String(initiator.name),
      },
      contents: {
        en: chat.is_group
          ? `${
              contact?.name ? String(contact?.name) : String(initiator.name)
            }: ${message.text}`
          : message.text,
      },
      data: {
        msg_text: message.text,
        msg_type: message.message_type,
        chat_id: String(chat.id),
        chat_name: String(chat.name),
        user_id: String(initiator.id),
        user_name: String(initiator.name),
        user_contact_name: contact?.name || "",
        user_nickname: String(initiator.nickname),
        user_avatar: String(initiator.avatar) || "",
        chat_avatar: String(chat.avatar),
        is_group: chat.is_group ? "true" : "false",
      },
      android_group: chat.id,
      include_player_ids: [playerId],
    };
    await this.client.createNotification(notification);
  }
}
