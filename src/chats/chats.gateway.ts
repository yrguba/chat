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
      this.usersService.getUser(userId).then(async (user) => {
        if (user && user.socket_id) {
          const status = this.sharedService.checkMessageStatus(
            userId,
            chat.message.users_have_read
          );
          const haveRead = await this.sharedService.getUsersHaveRead(
            chat.message
          );
          this.server?.sockets?.to(user.socket_id)?.emit("receiveMessage", {
            message: {
              ...chat?.message,
              chat_id: chat.chat_id,
              message_status: status,
              users_have_read: haveRead,
            },
          });
        }
      });
    });
  }

  handleEmitForwardMessage(data) {
    data?.users.map((userId) => {
      this.usersService.getUser(userId).then(async (user) => {
        if (user && user.socket_id) {
          const status = this.sharedService.checkMessageStatus(
            userId,
            data.data.message.users_have_read
          );
          const haveRead = await this.sharedService.getUsersHaveRead(
            data.data.message
          );
          this.server?.sockets
            ?.to(user.socket_id)
            ?.emit("receiveForwardMessage", {
              chat_id: Number(data.chat_id),
              message: {
                ...data.data.message,
                message_status: status,
                users_have_read: haveRead,
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

  @SubscribeMessage("searchMessages")
  async handleSearchMessages(client: any, payload: any) {
    const foundMessages = await this.chatsService.getSearchMessages(payload);
    this.server?.sockets?.to(client.id)?.emit("receiveFoundMessages", {
      chat_id: payload.chat_id,
      messages: foundMessages,
    });
  }

  @SubscribeMessage("messageAction")
  async handleMessageAction(client: any, payload: any) {
    const clientUserId = this.getUserId(client);
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

  @SubscribeMessage("chatListeners")
  async handleChatListeners(client: any, payload: any) {
    const clientUserId = this.getUserId(client);
    await this.chatsService.setChatListeners(clientUserId, payload);
  }

  @SubscribeMessage("messageRead")
  async handleMessageReadAction(
    client: any,
    { chat_id, messages }: { chat_id: number; messages: number[] }
  ) {
    const messagesReq = [];
    const clientUserId = this.getUserId(client);
    for (let messageId of messages) {
      const message = await this.sharedService.getMessage(chat_id, messageId);
      if (!message.users_have_read.includes(clientUserId)) {
        message.users_have_read.push(clientUserId);
        await this.sharedService.saveMessage(message);
      }
      const withoutInitiator = message.users_have_read.filter(
        (i) => i !== message.initiator_id
      );
      message.users_have_read = await this.sharedService.getChatUsers(
        withoutInitiator,
        clientUserId,
        true
      );
      messagesReq.push(message);
    }
    const chat = await this.sharedService.getChatWithChatUsers(chat_id);
    for (let user of chat.chatUsers) {
      const { pending } = await this.sharedService.getCountMessages(
        user.id,
        chat.id
      );
      for (let message of messagesReq) {
        const ids = message.users_have_read.map((user) => user.id);
        ids.push(message.initiator_id);
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
