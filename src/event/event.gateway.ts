import { Socket } from "socket.io";
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
  SubscribeMessage,
} from "@nestjs/websockets";
import { Server } from "socket.io";
import { ConversationService } from "src/conversation/conversation.service";

@WebSocketGateway({
  transports: ["websocket"],
  cors: "*",
})
export class EventGateway implements OnGatewayDisconnect {
  constructor(private readonly conversationService: ConversationService) {}
  @WebSocketServer()
  server: Server;

  public roomsMap: Map<string, Set<number>> = new Map();
  public onlineUsers: Map<number, Socket> = new Map();
  public currentChatId: number = undefined;

  @SubscribeMessage("joinRoom")
  joinRoom(client: Socket, payload: { userId: number; roomName: string }) {
    const { userId, roomName } = payload;

    let userJoinedRooms = this.roomsMap.get(roomName);

    if (!userJoinedRooms) {
      userJoinedRooms = new Set<number>();
      this.roomsMap.set(roomName, userJoinedRooms);
    }

    userJoinedRooms.add(userId);

    client.data.userId = userId;

    client.join(roomName);
  }

  @SubscribeMessage("setCurrentChatId")
  setCurrentChatId(
    client: Socket,
    payload: { chatId: number; userId: number }
  ) {
    const { chatId, userId } = payload;

    // Update the currentChatId property of the Socket object for the user

    client.data.currentChatId = chatId;
    client.data.userId = userId;

    // Store the Socket object in the onlineUsers map
    this.onlineUsers.set(userId, client);
  }

  @SubscribeMessage("addUser")
  async addUser(client: Socket, payload: { userId: number }) {
    const { userId } = payload;
    client.data.userId = userId; //manually set another way to identify user's socket
    this.onlineUsers.set(Number(userId), client);
    this.server.emit("onlineUsers", Array.from(this.onlineUsers.keys()));

    const conversations = await this.conversationService.getRoomsUsersIsInto(
      userId
    );

    conversations.forEach((conversation) => {
      const payload = {
        userId: conversation.id,
        roomName: conversation.name,
      };
      this.joinRoom(client, payload);
    });
  }

  handleDisconnect(socket: Socket) {
    const userIdToRemove = socket.data.userId;
    console.log(userIdToRemove, socket.data);
    this.onlineUsers.delete(Number(userIdToRemove));
    this.server.emit("onlineUsers", Array.from(this.onlineUsers.keys()));
    for (const [roomName, userJoinedRooms] of this.roomsMap.entries()) {
      if (userJoinedRooms.delete(userIdToRemove)) {
        const onlineUsersInRoom = this.getOnlineUsersInRoom(roomName);
        this.server.to(roomName).emit("onlineUsers", onlineUsersInRoom);
      }
    }
  }

  public getOnlineUsersInRoom(roomName: string): number[] {
    const onlineUsersInRoom: number[] = [];
    const userJoinedRooms = this.roomsMap.get(roomName);

    if (userJoinedRooms) {
      for (const userId of userJoinedRooms) {
        if (this.onlineUsers.has(userId)) {
          onlineUsersInRoom.push(userId);
        }
      }
    }

    return onlineUsersInRoom;
  }
}
