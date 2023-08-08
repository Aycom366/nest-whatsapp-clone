import { Socket } from "socket.io";
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
} from "@nestjs/websockets";
import { Server } from "socket.io";
import { ConversationService } from "src/conversation/conversation.service";

@WebSocketGateway({
  cors: "*",
})
export class EventGateway implements OnGatewayDisconnect {
  constructor(private readonly conversationService: ConversationService) {}
  @WebSocketServer()
  server: Server;

  public roomsMap: Map<string, Set<number>> = new Map(); // Room Name -> Set of User IDs
  public onlineUsers: Map<number, Socket> = new Map(); // User ID -> Socket
  public currentChatId: Map<number, number> = new Map(); //userId -> chatId

  @SubscribeMessage("joinRoom")
  joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomName: string; userId: number }
  ) {
    const { roomName, userId } = payload;
    if (this.roomsMap.has(roomName)) {
      this.roomsMap.get(roomName).add(userId);
    } else {
      this.roomsMap.set(roomName, new Set([userId]));
    }

    console.log("join room");

    client.join(roomName);
  }

  @SubscribeMessage("addUser")
  async addUser(
    @MessageBody() payload: { userId: number },
    @ConnectedSocket() client: Socket
  ) {
    const { userId } = payload;
    console.log("clienting", client.id);
    if (this.onlineUsers.has(userId)) {
      const existingSocket = this.onlineUsers.get(userId);
      // Disconnect the existing socket
      // user might login from another browser
      existingSocket.disconnect(true);
    }
    //set up this socket again
    this.onlineUsers.set(userId, client);

    const conversations = await this.conversationService.getRoomsUsersIsInto(
      userId
    );

    conversations.forEach((conversation) => {
      const payload = {
        userId,
        roomName: conversation.name,
      };
      this.joinRoom(client, payload);
    });

    this.server.emit("onlineUsers", Array.from(this.onlineUsers.keys()));
  }

  public getUsersInRoom(roomName: string) {
    const users = this.roomsMap.get(roomName);
    return users ? Array.from(users) : [];
  }

  @SubscribeMessage("setCurrentChatId")
  setCurrentChatId(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: number; userId: number }
  ) {
    const { chatId, userId } = payload;
    this.currentChatId.set(userId, chatId);
    console.log("changing chat", client.id, chatId);
  }

  handleDisconnect(client: Socket) {
    console.log("disconnect", client.id);
    const disconnectedUserId = this.getUserIdBySocket(client);

    if (disconnectedUserId) {
      this.onlineUsers.delete(disconnectedUserId);
      this.currentChatId.delete(disconnectedUserId);
    }

    this.server.emit("onlineUsers", Array.from(this.onlineUsers.keys()));

    // Iterate through the roomsMap to find the rooms the user is in and remove the user from those rooms.
    this.roomsMap.forEach((userIds, roomName) => {
      if (userIds.has(disconnectedUserId)) {
        userIds.delete(disconnectedUserId);
        if (userIds.size === 0) {
          this.roomsMap.delete(roomName);
        }
      }
    });
  }

  public getUserIdBySocket(client: Socket): number | undefined {
    const userEntry = Array.from(this.onlineUsers.entries()).find(
      ([_, socket]) => socket.id === client.id
    );
    return userEntry ? userEntry[0] : undefined;
  }
}
