import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Socket, Server } from "socket.io";
import { ChatsService } from "./chats.service";
import { UsersService } from "../users/users.service";
import { getUserSchema } from "../utils/schema";
import { SharedService } from "../shared/shared.service";
import { MessagesService } from "../messages/messages.service";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class ChatsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private chatsService: ChatsService,
    private usersService: UsersService,
    private sharedService: SharedService,
    private messagesServices: MessagesService
  ) {}

  @WebSocketServer() server: Server;

  handleEmitNewChat(chat) {
    chat?.users?.map((userId) => {
      this.usersService.getUser(userId).then((user) => {
        if (user && user.socket_id) {
          this.server?.sockets?.to(user.socket_id)?.emit("receiveChat", {
            message: chat,
          });
        }
      });
    });
  }

  handleEmitAddToChat(data) {
    data?.invited.map((userId) => {
      this.usersService.getUser(userId).then(async (user) => {
        data.message.message.text =
          await this.messagesServices.updTextSystemMessage(
            userId,
            data.message.message
          );
        for (let user of data.chat.chatUsers) {
          const contact = await this.sharedService.getContact(
            userId,
            user.phone
          );
          user.contactName = contact?.name || "";
        }
        if (user && user.socket_id) {
          this.server?.sockets?.to(user.socket_id)?.emit("addedToChat", {
            message: { ...data.chat, message: data.message.message },
          });
        }
      });
    });
  }

  handleEmitDeleteFromChat(chat) {
    chat?.users.map((userId) => {
      this.usersService.getUser(userId).then((user) => {
        if (user && user.socket_id) {
          this.server?.sockets?.to(user.socket_id)?.emit("removedFromChat", {
            message: chat,
          });
        }
      });
    });
  }

  handleUpdateChat(data) {
    data.chat.chatUsers.map(async (user) => {
      if (data.updatedValues?.chatUsers?.length) {
        data.updatedValues.chatUsers =
          await this.sharedService.changeContactName(
            user.id,
            data.chat.chatUsers
          );
      }
      this.server?.sockets?.to(user.socket_id)?.emit("receiveChatChanges", {
        data: {
          chatId: data.chat.id,
          updatedValues: data.updatedValues,
        },
      });
    });
  }

  @SubscribeMessage("chatListeners")
  async handleChatListeners(client: any, payload: any) {
    const clientUserId = this.sharedService.getUserId(client);
    await this.chatsService.setChatListeners(clientUserId, payload);
  }

  @SubscribeMessage("ping")
  handlePing(client: any, payload: any): string {
    client?.socket?.emit("pong", {
      message: "pong",
    });
    return "";
  }

  afterInit(server: Server) {
    this.chatsService.socket = server;
  }

  handleDisconnect(client: Socket) {
    const clientUserId = this.sharedService.getUserId(client);
    if (clientUserId) {
      this.usersService
        .updateUserStatus(clientUserId, false)
        .then((initiator) => {
          this.chatsService.getUserChats(clientUserId).then((chats) => {
            if (chats) {
              chats.map((chat) => {
                chat?.users.map((userId) => {
                  if (userId !== clientUserId) {
                    this.usersService.getUser(userId).then((user) => {
                      if (user && user.socket_id) {
                        this.server?.sockets
                          ?.to(user.socket_id)
                          ?.emit("receiveUserStatus", {
                            user: getUserSchema(initiator),
                            status: "offline",
                          });
                      }
                    });
                  }
                });
              });
            }
          });
        });
    }

    console.log("disconnect client");
  }

  handleConnection(client: Socket, ...args: any[]) {
    const clientUserId = this.sharedService.getUserId(client);
    if (clientUserId) {
      this.usersService
        .updateUserSocket(clientUserId, client.id, true)
        .then((initiator) => {
          this.chatsService.getUserChats(clientUserId).then((chats) => {
            if (chats) {
              chats.map((chat) => {
                chat?.users.map((userId) => {
                  if (userId !== clientUserId) {
                    this.usersService.getUser(userId).then((user) => {
                      if (user && user.socket_id) {
                        this.server?.sockets
                          ?.to(user.socket_id)
                          ?.emit("receiveUserStatus", {
                            user: getUserSchema(initiator),
                            status: "online",
                          });
                      }
                    });
                  }
                });
              });
            }
          });
        });
    }
  }
}
