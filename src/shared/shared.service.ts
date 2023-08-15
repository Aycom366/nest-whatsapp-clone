import { Injectable } from "@nestjs/common";
import { Socket } from "socket.io";

@Injectable()
export class SharedService {
  public roomsMap: Map<string, Set<number>> = new Map(); // Room Name -> Set of User IDs
  public onlineUsers: Map<number, Socket> = new Map(); // User ID -> Socket
  public currentChatId: Map<number, number> = new Map(); //userId -> chatId

  public getUserIdBySocket(client: Socket): number | undefined {
    const userEntry = Array.from(this.onlineUsers.entries()).find(
      ([_, socket]) => socket.id === client.id
    );
    return userEntry ? userEntry[0] : undefined;
  }
}
