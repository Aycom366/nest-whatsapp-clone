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
import { User } from "@prisma/client";
import { SharedService } from "src/shared/shared.service";
import { OnEvent } from "@nestjs/event-emitter";

@WebSocketGateway({
  cors: "*",
  transports: ["websocket"],
})
export class EventGateway implements OnGatewayDisconnect {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly sharedService: SharedService
  ) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage("joinRoom")
  joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomName: string; userId: number }
  ) {
    const { roomName, userId } = payload;
    if (this.sharedService.roomsMap.has(roomName)) {
      this.sharedService.roomsMap.get(roomName).add(userId);
    } else {
      this.sharedService.roomsMap.set(roomName, new Set([userId]));
    }

    client.join(roomName);
  }

  @SubscribeMessage("addUser")
  async addUser(
    @MessageBody() payload: { userId: number },
    @ConnectedSocket() client: Socket
  ) {
    const { userId } = payload;
    if (this.sharedService.onlineUsers.has(userId))
      this.sharedService.onlineUsers.delete(userId);

    this.sharedService.onlineUsers.set(userId, client);

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

    this.server.emit(
      "onlineUsers",
      Array.from(this.sharedService.onlineUsers.keys())
    );
  }

  public getUsersInRoom(roomName: string) {
    const users = this.sharedService.roomsMap.get(roomName);
    return users ? Array.from(users) : [];
  }

  @SubscribeMessage("start-conversation-action")
  startConversationAction(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      conversationId: number;
      user: User;
      data: string;
      roomName: string;
    }
  ) {
    client.to(payload.roomName).emit("startMessageAction", payload);
  }

  @SubscribeMessage("stop-conversation-action")
  stopConversationAction(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      conversationId: number;
      roomName: string;
    }
  ) {
    client
      .to(payload.roomName)
      .emit("stopMessageAction", payload.conversationId);
  }

  @SubscribeMessage("setCurrentChatId")
  setCurrentChatId(@MessageBody() payload: { chatId: number; userId: number }) {
    const { chatId, userId } = payload;
    if (this.sharedService.currentChatId.has(userId))
      this.sharedService.currentChatId.delete(userId);

    this.sharedService.currentChatId.set(userId, chatId);
  }

  handleDisconnect(client: Socket) {
    const disconnectedUserId = this.sharedService.getUserIdBySocket(client);

    if (disconnectedUserId) {
      this.sharedService.onlineUsers.delete(disconnectedUserId);
      this.sharedService.currentChatId.delete(disconnectedUserId);
    }

    this.server.emit(
      "onlineUsers",
      Array.from(this.sharedService.onlineUsers.keys())
    );

    // Iterate through the sharedService.roomsMap to find the rooms the user is in and remove the user from those rooms.
    this.sharedService.roomsMap.forEach((userIds, roomName) => {
      if (userIds.has(disconnectedUserId)) {
        userIds.delete(disconnectedUserId);
        if (userIds.size === 0) {
          this.sharedService.roomsMap.delete(roomName);
        }
      }
    });
  }

  /**Event Emitters**/
  @OnEvent("room.removeUser")
  removeUserFromRoom(payload: {
    roomName: string;
    users: { id: number }[];
    conversation: any;
  }) {
    const { roomName, users, conversation } = payload;
    const socketInstance = this.sharedService.onlineUsers.get(users[1].id);
    if (socketInstance) {
      socketInstance
        .to(roomName)
        .emit("updateConversationInformation", conversation);
    }

    this.sharedService.roomsMap.get(roomName).delete(users[0].id);
  }

  @OnEvent("join.room")
  addUsersToRoom(payload: {
    conversation: any;
    roomName: string;
    users: { id: number }[];
  }) {
    const { roomName, users, conversation } = payload;
    users.forEach((user) => {
      if (this.sharedService.onlineUsers.has(user.id)) {
        this.joinRoom(this.sharedService.onlineUsers.get(user.id), {
          roomName,
          userId: user.id,
        });
      }
    });

    const socketInstance = this.sharedService.onlineUsers.get(
      users[users.length - 1].id
    );

    if (socketInstance) {
      socketInstance.to(roomName).emit("newConversation", conversation);
    }
  }

  @OnEvent("room.update")
  updateRooms(payload: {
    conversation: any;
    oldRoomName: string;
    newRoomName: string;
    userThatInitiate: number;
    users: { id: number }[];
  }) {
    const { newRoomName, oldRoomName, users, userThatInitiate, conversation } =
      payload;
    this.sharedService.roomsMap.delete(oldRoomName);

    users.forEach((user) => {
      if (this.sharedService.onlineUsers.has(user.id)) {
        this.joinRoom(this.sharedService.onlineUsers.get(user.id), {
          roomName: newRoomName,
          userId: user.id,
        });
      }
    });

    const socketInstance = this.sharedService.onlineUsers.get(userThatInitiate);

    if (socketInstance) {
      socketInstance
        .to(newRoomName)
        .emit("updateConversationInformation", conversation);
    }
  }

  @OnEvent("messages.updated")
  sendUpdateMessagesToConnectedSockets(payload: {
    roomName: string;
    updatedMessages: any;
  }) {
    const { roomName, updatedMessages } = payload;
    this.server.to(roomName).emit("updateMessageStatus", updatedMessages);
  }

  @OnEvent("messages.deliver")
  sendDeliverStatusToConnectedSockets(payload: {
    roomNames: string[];
    updatedMessages: any;
  }) {
    const { roomNames, updatedMessages } = payload;
    roomNames.forEach((room) =>
      this.server.to(room).emit("messagesDeliver", updatedMessages)
    );
  }
}
