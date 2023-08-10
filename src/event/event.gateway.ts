import { Socket } from "socket.io";
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server } from "socket.io";
import { ConversationService } from "src/conversation/conversation.service";
import { Inject, forwardRef } from "@nestjs/common";

interface UserData {
  id: number;
  name: string;
  email: string;
  picture: string;
}

@WebSocketGateway({
  cors: "*",
  transports: ["websocket"],
})
export class EventGateway implements OnGatewayDisconnect {
  constructor(
    @Inject(forwardRef(() => ConversationService))
    private readonly conversationService: ConversationService
  ) {}
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

    client.join(roomName);
  }

  @SubscribeMessage("addUser")
  async addUser(
    @MessageBody() payload: { userId: number },
    @ConnectedSocket() client: Socket
  ) {
    const { userId } = payload;
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

    console.log("clienting", client.id);

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
  }

  @SubscribeMessage("callUsers")
  callUsers(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      from: UserData;
      to: UserData[];
      callType: "video" | "voice";
      roomId: string;
      signalData: any;
    }
  ) {
    console.log("calling user");
    payload.to.forEach((user) => {
      const socket = this.onlineUsers.get(user.id);
      if (socket) {
        client.to(socket.id).emit(`incoming-${payload.callType}-call`, payload);
      }
    });
  }

  @SubscribeMessage("acceptCall")
  acceptIncomingCall(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      from: UserData;
      callType: "video" | "voice";
      signalData: any;
      user: UserData;
    }
  ) {
    const socketinstance = this.onlineUsers.get(payload.from.id);
    if (socketinstance) {
      client
        .to(socketinstance.id)
        .emit(`${payload.callType}-accepted`, payload);
    }
  }

  @SubscribeMessage("rejectCall")
  rejectCall(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { userId: number; callType: "video" | "voice"; name: string }
  ) {
    const socketinstance = this.onlineUsers.get(payload.userId);
    if (socketinstance) {
      return client
        .to(socketinstance.id)
        .emit(`${payload.callType}-rejected`, { name: payload.name });
    }
  }

  handleDisconnect(client: Socket) {
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
