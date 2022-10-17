import {
    SubscribeMessage,
    WebSocketGateway,
    OnGatewayInit,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { JwtService } from "@nestjs/jwt";
import { Socket, Server } from 'socket.io';
import { ChatsService } from "./chats.service";
import { UsersService } from "../users/users.service";
import { messageStatuses } from "./constants";
import { getUserSchema } from "../utils/schema";


@WebSocketGateway({
    cors: {
        origin: '*',
    },
})

export class ChatsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private chatsService: ChatsService,
        private usersService: UsersService,
        private readonly jwtService: JwtService
    ) {
        this.usersPool = [];
    }

    @WebSocketServer() server: Server;
    private usersPool: any[];

    handleEmit(data) {
        data?.users.map((userId) => {
            this.usersService.getUser(userId).then((user) => {
                if (user && user.socket_id) {
                    this.server?.sockets?.to(user.socket_id)?.emit('receiveMessage', {
                        message: {...data?.message, chat_id: data.chat_id},
                    });
                } else {
                    //send push
                }
            });
        });
    };

    handleEmitDeleteMessage(data) {
        data?.chat?.users.map((userId) => {
            this.usersService.getUser(userId).then((user) => {
                if (user && user.socket_id) {
                    this.server?.sockets?.to(user.socket_id)?.emit('receiveDeleteMessage', {
                        message: {...data?.message, chat_id: data?.chat.chat_id},
                    });
                }
            });
        });
    };

    handleChangeMessageStatus(data) {
        data?.users.map((userId) => {
            this.usersService.getUser(userId).then((user) => {
                if (user && user.socket_id) {
                    this.server?.sockets?.to(user.socket_id)?.emit('receiveMessageStatus', {
                        messages: {messages: data?.messages, chat_id: data.chat_id, status: data.status},
                    });
                }
            });
        });
    };

    handleEmitNewChat(chat) {
        chat?.users.map((userId) => {
            this.usersService.getUser(userId).then((user) => {
                if (user && user.socket_id) {
                    this.server?.sockets?.to(user.socket_id)?.emit('receiveChat', {
                        message: chat,
                    });
                } else {
                    //send push
                }
            });

        });
    };

    handleEmitAddToChat(chat) {
        chat?.users.map((userId) => {
            this.usersService.getUser(userId).then((user) => {
                if (user && user.socket_id) {
                    this.server?.sockets?.to(user.socket_id)?.emit('addedToChat', {
                        message: chat,
                    });
                } else {
                    //send push
                }
            });

        });
    };

    handleEmitDeleteFromChat(chat) {
        chat?.users.map((userId) => {
            this.usersService.getUser(userId).then((user) => {
                if (user && user.socket_id) {
                    this.server?.sockets?.to(user.socket_id)?.emit('removedFromChat', {
                        message: chat,
                    });
                } else {
                    //send push
                }
            });

        });
    };

    @SubscribeMessage('messageAction')
    handleMessageAction(client: any, payload: any) {
        const jwt = client.handshake?.headers?.authorization?.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        if (json?.id) {
            const {
                chat_id,
                action,
            } = payload;
            this.usersService.getUser(json.id).then((initiator) => {
                this.chatsService.getChat(json.id, chat_id).then((data: any) => {
                    data?.data?.data?.users.map((userId) => {
                        this.usersService.getUser(userId).then((user) => {
                            if (user && user?.id) {
                                if (user.id !== json.id) {
                                    if (user && user.socket_id) {
                                        this.server?.sockets?.to(user.socket_id)?.emit('receiveMessageAction', {
                                            message: {
                                                user: getUserSchema(initiator),
                                                action: action,
                                                chat_id: chat_id,
                                            }
                                        });

                                    }
                                }
                            }
                        });
                    });
                });
            });
        }
        return '';
    }

    @SubscribeMessage('ping')
    handlePing(client: any, payload: any): string {
        client?.socket?.emit('pong', {
            message: 'pong',
        });
        return '';
    }

    afterInit(server: Server) {
        this.chatsService.socket = server;
        //Do stuffs
    }

    handleDisconnect(client: Socket) {
        const jwt = client.handshake?.headers?.authorization?.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        if (json?.id) {
            this.usersService.updateUserStatus(json.id, false).then(initiator => {
                this.chatsService.getUserChats(json.id).then(data => {
                    data?.users.map((userId) => {
                        if (userId !== json?.id) {
                            this.usersService.getUser(userId).then((user) => {
                                if (user && user.socket_id) {
                                    this.server?.sockets?.to(user.socket_id)?.emit('receiveUserStatus', {
                                        user: getUserSchema(initiator),
                                        status: "offline",
                                    });
                                }
                            });
                        }
                    });
                });
            });
        }

        console.log('disconnect client');
    }

    handleConnection(client: Socket, ...args: any[]) {
        const jwt = client.handshake?.headers?.authorization?.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        if (json?.id) {
            this.usersService.updateUserSocket(json.id, client.id, true).then(initiator => {
                this.chatsService.getUserChats(json.id).then(data => {
                    console.log(data);
                    if (data) {
                        data?.users.map((userId) => {
                            if (userId !== json?.id) {
                                this.usersService.getUser(userId).then((user) => {
                                    if (user && user.socket_id) {
                                        this.server?.sockets?.to(user.socket_id)?.emit('receiveUserStatus', {
                                            user: getUserSchema(initiator),
                                            status: "online",
                                        });
                                    }
                                });
                            }
                        });
                    }

                })
            });
        }
    }
}
