import {
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  cors: "*",
  transports: ["websocket"],
})
export class EventGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  public onlineUsers: Map<number, Socket> = new Map();
  public usersCurrentChat: Map<number, number> = new Map();

  @SubscribeMessage("addUser")
  addUser(client: Socket, payload: { userId: number }) {
    const { userId } = payload;
    this.onlineUsers.set(Number(userId), client);
  }

  @SubscribeMessage("joinRoom")
  joinRooms() {}

  @SubscribeMessage("setCurrentChat")
  setCurrentChat(
    @MessageBody() data: { currentChatId: number; userId: number }
  ) {
    this.usersCurrentChat.set(data.userId, data.currentChatId);
  }

  handleDisconnect(socket: Socket) {
    // Remove the user from the onlineUsers map when they disconnect.
    const userIdToRemove = Array.from(this.onlineUsers.entries()).find(
      ([_, s]) => s === socket
    )?.[0];
    if (userIdToRemove !== undefined) {
      this.onlineUsers.delete(userIdToRemove);
    }
  }
}
