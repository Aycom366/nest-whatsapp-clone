import { Socket } from "socket.io";
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
  SubscribeMessage,
} from "@nestjs/websockets";
import { Server } from "socket.io";

@WebSocketGateway({ cors: "*" })
export class EventGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  public roomsMap: Map<string, Set<number>> = new Map();
  public onlineUsers: Map<number, Socket> = new Map();

  @SubscribeMessage("joinRoom")
  joinRoom(client: Socket, payload: { userId: number; roomName: string }) {
    const { userId, roomName } = payload;

    let userJoinedRooms = this.roomsMap.get(roomName);

    if (!userJoinedRooms) {
      userJoinedRooms = new Set<number>();
      this.roomsMap.set(roomName, userJoinedRooms);
    }

    userJoinedRooms.add(userId);
    client.join(roomName);

    const onlineUsersInRoom = this.getOnlineUsersInRoom(roomName);
    this.server.to(roomName).emit("onlineUsers", onlineUsersInRoom);
  }

  @SubscribeMessage("addUser")
  addUser(client: Socket, payload: { userId: number }) {
    const { userId } = payload;
    this.onlineUsers.set(Number(userId), client);
  }

  handleDisconnect(socket: Socket) {
    const userIdToRemove = Number(socket.id);
    for (const [roomName, userJoinedRooms] of this.roomsMap.entries()) {
      if (userJoinedRooms.delete(userIdToRemove)) {
        const onlineUsersInRoom = this.getOnlineUsersInRoom(roomName);
        this.server.to(roomName).emit("onlineUsers", onlineUsersInRoom);
      }
    }
    this.onlineUsers.delete(userIdToRemove);
  }

  public getOnlineUsersInRoom(roomName: string): number[] {
    const onlineUsersInRoom: number[] = [];
    const userJoinedRooms = this.roomsMap.get(roomName);

    if (userJoinedRooms) {
      for (const userId of userJoinedRooms) {
        if (this.onlineUsers.has(userId)) {
          // If the user is in the onlineUsers Map, it means the user is online in the room
          onlineUsersInRoom.push(userId);
        }
      }
    }

    return onlineUsersInRoom;
  }
}
