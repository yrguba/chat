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
    private readonly jwtService: JwtService
  ) {}

  @WebSocketServer() server: Server;

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

  @SubscribeMessage("messageAction")
  handleMessageAction(client: any, payload: any) {
    const jwt = client.handshake?.headers?.authorization?.replace(
      "Bearer ",
      ""
    );
    const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
    if (json?.id) {
      const { chat_id, action } = payload;
      this.usersService.getUser(json.id).then((initiator) => {
        this.chatsService.getChat(json.id, chat_id).then((data: any) => {
          data?.data?.data?.users.map((userId) => {
            this.usersService.getUser(userId).then((user) => {
              if (user && user?.id) {
                if (user.id !== json.id) {
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
    const jwt = client.handshake?.headers?.authorization?.replace(
      "Bearer ",
      ""
    );
    const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
    if (json?.id) {
      this.usersService.updateUserStatus(json.id, true).then((initiator) => {
        this.chatsService.getUserChats(json.id).then((chats) => {
          if (chats) {
            chats.map((chat) => {
              chat?.users.map((userId) => {
                if (userId !== json?.id) {
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
    const jwt = client.handshake?.headers?.authorization?.replace(
      "Bearer ",
      ""
    );
    const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
    if (json?.id) {
      this.usersService
        .updateUserSocket(json.id, client.id, true)
        .then((initiator) => {
          this.chatsService.getUserChats(json.id).then((chats) => {
            if (chats) {
              chats.map((chat) => {
                chat?.users.map((userId) => {
                  if (userId !== json?.id) {
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
