import { OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
export declare class EventGateway implements OnGatewayDisconnect {
    server: Server;
    onlineUsers: Map<number, Socket>;
    addUser(client: Socket, payload: {
        userId: number;
    }): void;
    handleDisconnect(socket: Socket): void;
}
