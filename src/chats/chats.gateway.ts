import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import { Socket, Server } from "socket.io";
import { ChatsService } from "./chats.service";
import { UsersService } from "../users/users.service";
import { getUserSchema } from "../utils/schema";
import { messageStatuses } from "./constants";
import { SharedService } from "../shared/shared.service";

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
    private readonly jwtService: JwtService,
    private sharedService: SharedService
  ) {}

  @WebSocketServer() server: Server;

  private getUserId(client) {
    const jwt = client.handshake?.headers?.authorization?.replace(
      "Bearer ",
      ""
    );
    const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
    return json?.id;
  }

  handleEmitNewMessage(chat) {
    chat?.users.map((userId) => {
      this.usersService.getUser(userId).then((user) => {
        if (user && user.socket_id) {
          this.server?.sockets?.to(user.socket_id)?.emit("receiveMessage", {
            message: { ...chat?.message, chat_id: chat.chat_id },
          });
        }
      });
    });
  }

  handleEmitForwardMessage(data) {
    data?.users.map((userId) => {
      this.usersService.getUser(userId).then(async (user) => {
        if (user && user.socket_id) {
          this.server?.sockets
            ?.to(user.socket_id)
            ?.emit("receiveForwardMessage", {
              chat_id: Number(data.chat_id),
              message: data.data.message,
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

  handleChangeMessageStatus(data) {
    data?.chatUsers.map((userId) => {
      this.usersService.getUser(userId).then((user) => {
        if (user && user.socket_id) {
          this.server?.sockets
            ?.to(user.socket_id)
            ?.emit("receiveMessageStatus", {
              messages: data?.messages,
            });
        }
      });
    });
  }

  handleEmitNewChat(chat) {
    chat?.users.map((userId) => {
      this.usersService.getUser(userId).then((user) => {
        if (user && user.socket_id) {
          this.server?.sockets?.to(user.socket_id)?.emit("receiveChat", {
            message: chat,
          });
        }
      });
    });
  }

  handleEmitAddToChat(chat) {
    chat?.users.map((userId) => {
      this.usersService.getUser(userId).then((user) => {
        if (user && user.socket_id) {
          this.server?.sockets?.to(user.socket_id)?.emit("addedToChat", {
            message: chat,
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

  handleEmitChatPendingMessagesCount(initiator_id, chat) {
    this.chatsService
      .getChatUnreadMessages(initiator_id, chat.id)
      .then((count) => {
        chat?.users.map((userId) => {
          this.usersService.getUser(userId).then((user) => {
            if (user && user.socket_id) {
              this.server?.sockets
                ?.to(user.socket_id)
                ?.emit("chatPendingMessages", {
                  chat_id: chat.id,
                  pending_messages: count,
                });
            }
          });
        });
      });
  }

  @SubscribeMessage("searchMessages")
  async handleSearchMessages(client: any, payload: any) {
    const foundMessages = await this.chatsService.getSearchMessages(payload);
    this.server?.sockets?.to(client.id)?.emit("receiveFoundMessages", {
      chat_id: payload.chat_id,
      messages: foundMessages,
    });
  }

  @SubscribeMessage("messageAction")
  handleMessageAction(client: any, payload: any) {
    const clientUserId = this.getUserId(client);
    if (clientUserId) {
      const { chat_id, action } = payload;
      this.usersService.getUser(clientUserId).then((initiator) => {
        this.chatsService.getChat(clientUserId, chat_id).then((data: any) => {
          data?.data?.data?.users.map((userId) => {
            this.usersService.getUser(userId).then((user) => {
              if (user && user?.id) {
                if (user.id !== clientUserId) {
                  if (user && user.socket_id) {
                    this.server?.sockets
                      ?.to(user.socket_id)
                      ?.emit("receiveMessageAction", {
                        message: {
                          user: getUserSchema(initiator),
                          action: action,
                          chat_id: chat_id,
                        },
                      });
                  }
                }
              }
            });
          });
        });
      });
    }
    return "";
  }

  @SubscribeMessage("messageRead")
  handleMessageReadAction(
    client: any,
    payload: { chat_id: number; messages: number[] }
  ) {
    const clientUserId = this.getUserId(client);
    const { chat_id, messages } = payload;

    const updatedMessages = [];

    for (const message of messages) {
      this.chatsService
        .updateMessageStatus(message, messageStatuses.read)
        .then((updatedMessage) => {
          updatedMessages.push(updatedMessage);

          if (messages.length === updatedMessages.length) {
            this.chatsService.getChatById(chat_id).then((chat) => {
              if (chat) {
                this.handleChangeMessageStatus({
                  chatUsers: chat.users,
                  messages: updatedMessages,
                });

                this.handleEmitChatPendingMessagesCount(clientUserId, chat);
              }
            });
          }
        });
    }
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
    const clientUserId = this.getUserId(client);
    if (clientUserId) {
      this.usersService
        .updateUserStatus(clientUserId, true)
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
    const clientUserId = this.getUserId(client);
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
