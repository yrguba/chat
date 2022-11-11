import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { ChatsService } from "../chats/chats.service";
import { UsersService } from "../users/users.service";
import { SharedService } from "../shared/shared.service";
import { Server } from "socket.io";
import { MessagesService } from "./messages.service";
import { getUserSchema } from "../utils/schema";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class MessagesGateway {
  constructor(
    private chatsService: ChatsService,
    private messagesService: MessagesService,
    private usersService: UsersService,
    private sharedService: SharedService
  ) {}
  @WebSocketServer() server: Server;

  handleEmitNewMessage(chat) {
    const { message } = chat;
    chat?.users.map((userId) => {
      this.usersService.getUser(userId).then(async (user) => {
        if (user && user.socket_id) {
          const status = this.sharedService.checkMessageStatus(
            userId,
            chat.message.users_have_read
          );
          const usersHaveRead = this.sharedService.getFilteredUsersHeavyRead(
            message.users_have_read,
            message.initiator_id
          );
          this.server?.sockets?.to(user.socket_id)?.emit("receiveMessage", {
            message: {
              ...message,
              users_have_read: usersHaveRead,
              chat_id: chat.chat_id,
              message_status: status,
            },
          });
        }
      });
    });
  }

  handleEmitForwardMessage(data) {
    const { message } = data.data;
    data?.users.map((userId) => {
      this.usersService.getUser(userId).then(async (user) => {
        if (user && user.socket_id) {
          const status = this.sharedService.checkMessageStatus(
            userId,
            message.users_have_read
          );
          const usersHaveRead = this.sharedService.getFilteredUsersHeavyRead(
            message.users_have_read,
            message.initiator_id
          );
          this.server?.sockets
            ?.to(user.socket_id)
            ?.emit("receiveForwardMessage", {
              chat_id: Number(data.chat_id),
              message: {
                ...message,
                users_have_read: usersHaveRead,
                message_status: status,
              },
            });
        }
      });
    });
  }

  handleEmitDeleteMessage(data) {
    data?.chat?.users.map((userId) => {
      this.usersService.getUser(userId).then((user) => {
        if (user && user.socket_id) {
          this.server?.sockets
            ?.to(user.socket_id)
            ?.emit("receiveDeleteMessage", {
              chat_id: data.chat.id,
              messages: data.messages,
            });
        }
      });
    });
  }

  handleUpdReactionsMessage(data) {
    data?.users.forEach((userId) => {
      this.usersService.getUser(userId).then((user) => {
        this.server?.sockets?.to(user.socket_id)?.emit("receiveReactions", {
          data: data.data,
        });
      });
    });
  }

  @SubscribeMessage("searchMessages")
  async handleSearchMessages(client: any, payload: any) {
    const foundMessages = await this.messagesService.getSearchMessages(payload);
    this.server?.sockets?.to(client.id)?.emit("receiveFoundMessages", {
      chat_id: payload.chat_id,
      messages: foundMessages,
    });
  }
  @SubscribeMessage("messageAction")
  async handleMessageAction(client: any, payload: any) {
    const clientUserId = this.sharedService.getUserId(client);
    if (clientUserId) {
      const { chat_id, action } = payload;
      const initiator = await this.sharedService.getUser(clientUserId);
      const chat = await this.sharedService.getChatWithChatUsers(chat_id);
      for (let user of chat.chatUsers) {
        if (user.id !== clientUserId) {
          const contact = await this.sharedService.getContact(
            user.id,
            initiator.phone
          );
          this.server?.sockets
            ?.to(user.socket_id)
            ?.emit("receiveMessageAction", {
              message: {
                user: getUserSchema({
                  ...initiator,
                  contactName: contact?.name || "",
                }),
                action: action,
                chat_id: chat_id,
              },
            });
        }
      }
    }
    return "";
  }

  @SubscribeMessage("messageRead")
  async handleMessageReadAction(
    client: any,
    { chat_id, messages }: { chat_id: number; messages: number[] }
  ) {
    if (!messages.length) return;
    const messagesReq = [];
    const clientUserId = this.sharedService.getUserId(client);
    for (let messageId of messages) {
      const message = await this.sharedService.getMessage(chat_id, messageId);
      if (message?.users_have_read) {
        if (!message.users_have_read.includes(clientUserId)) {
          message?.users_have_read.push(clientUserId);
          await this.sharedService.saveMessage(message);
        }
        message.users_have_read = this.sharedService.getFilteredUsersHeavyRead(
          message.users_have_read,
          message.initiator_id
        );
      }
      messagesReq.push(message);
    }
    const chat = await this.sharedService.getChatWithChatUsers(chat_id);
    for (let user of chat.chatUsers) {
      const { pending } = await this.sharedService.getCountMessages(
        user.id,
        chat.id
      );
      for (let message of messagesReq) {
        const ids = [...message.users_have_read, message.initiator_id];
        message.message_status = this.sharedService.checkMessageStatus(
          user.id,
          ids
        );
      }
      this.server?.sockets?.to(user.socket_id)?.emit("receiveMessageStatus", {
        pending_messages: pending,
        chat_id: chat.id,
        messages: messagesReq,
      });
    }
  }
}
