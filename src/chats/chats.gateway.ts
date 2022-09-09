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

import * as admin from 'firebase-admin';


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

    handleEmit (data) {
        data?.users.map((userId) => {
            this.usersService.getUser(userId).then((user) => {
                console.log(user.socket_id);
                if (user && user.socket_id) {
                    console.log(user.socket_id);
                    console.log(...data?.message.text);
                    this.server?.sockets?.to(user.socket_id)?.emit('receiveMessage', {
                        message: {...data?.message, chat_id: data.chat_id},
                    });
                } else {
                    //send push
                }
            });

        });
    };

    handleEmitNewChat (chat) {
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

    // @SubscribeMessage('sendMessage')
    // handleMessage(client: any, payload: any): string {
    //     const jwt = client.handshake?.headers?.authorization?.replace('Bearer ', '');
    //     const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
    //     if (json?.id) {
    //         const {
    //             chat_id,
    //             message
    //         } = payload;
    //
    //         this.chatsService.createMessage(chat_id, json.id, message).then((data: any) => {
    //             data?.users.map((userId) => {
    //                 const client = this.usersPool.find(user => user.user_id === userId);
    //                 if (client) {
    //                     console.log('receiveMessage dublicate');
    //                 } else {
    //                     //send push
    //                 }
    //             });
    //         });
    //     }
    //     return '';
    // }

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
        // const jwt = client.handshake?.headers?.authorization?.replace('Bearer ', '');
        // const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        // if (json?.id) {
        //     this.usersService.updateUserSocket(json.id, client.id, false).then(data => {
        //         console.log('disconnect client');
        //     });
        // }

        console.log('disconnect client');
    }

    handleConnection(client: Socket, ...args: any[]) {
        const jwt = client.handshake?.headers?.authorization?.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        if (json?.id) {
            this.usersService.updateUserSocket(json.id, client.id, true).then(data => {
                console.log('updated client');
            });
        }
    }
}
