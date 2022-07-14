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
import {log} from "util";

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})

export class ChatsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private usersPool: any[];

    constructor(
        private chatsService: ChatsService,
        private usersService: UsersService,
        private readonly jwtService: JwtService
    ) {
        this.usersPool = [];
    }

    @SubscribeMessage('sendMessage')
    handleMessage(client: any, payload: any): string {
        const jwt = client.handshake?.headers?.authorization?.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        if (json?.id) {
            const {
                chat_id,
                message
            } = payload;
            this.chatsService.createMessage(chat_id, json.id, message).then((data: any) => {
                data?.users.map((userId) => {
                    const client = this.usersPool.find(user => user.user_id === userId);
                    if (client) {
                        console.log(client);
                        client?.socket?.emit('receiveMessage', {
                            message: data.message,
                        });
                    } else {
                        //send push
                    }
                });
            });
        }
        return '';
    }

    afterInit(server: Server) {
        console.log(server);
        //Do stuffs
    }

    handleDisconnect(client: Socket) {
        const jwt = client.handshake?.headers?.authorization?.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        if (json?.id) {
            const currentUser = this.usersPool.findIndex(user => user.id === json.id);
            if (currentUser !== -1) {
                this.usersPool.splice(currentUser, 1);
            }
        }
    }

    handleConnection(client: Socket, ...args: any[]) {
        const jwt = client.handshake?.headers?.authorization?.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true }) as { id: number };
        if (json?.id) {
            this.usersService.updateUserSocket(json.id, client.id);
            const currentUser = this.usersPool.findIndex(user => user.id === json.id);
            if (currentUser !== -1) {
                this.usersPool.splice(currentUser, 1);
            }

            this.usersPool.push({
                user_id: json.id,
                socket: client
            });
        }
    }
}
