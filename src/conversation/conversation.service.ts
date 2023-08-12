import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { EventGateway } from "src/event/event.gateway";
import { PrismaService } from "src/prisma/prisma.service";

interface IProp {
  userId: number;
  name?: string;
}

@Injectable()
export class ConversationService {
  constructor(
    private readonly prismaService: PrismaService,

    @Inject(forwardRef(() => EventGateway))
    private readonly eventGate: EventGateway
  ) {}

  async accessConversation(info: IProp, currentLoginUserId: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id: info.userId },
    });
    if (!user) throw new NotFoundException();

    //check if currentLogin user in in conversation with this userId
    let chat = await this.prismaService.conversation.findFirst({
      where: {
        isGroup: false, // Check if isGroup is false
        users: {
          every: {
            id: { in: [info.userId, currentLoginUserId] },
          },
        },
      },
      include: {
        Message: {
          include: {
            seenUsers: true,
            deliveredTo: true,
          },
        },
        users: true,
      },
    });

    if (chat) {
      return chat;
    } else {
      chat = await this.prismaService.conversation.create({
        data: {
          name: info.name
            ? info.name + `?${Date.now()}`
            : Math.random().toString() + Date.now(),
          users: {
            connect: [
              {
                id: info.userId,
              },
              {
                id: currentLoginUserId,
              },
            ],
          },
        },
        include: {
          Message: {
            orderBy: {
              createdAt: "desc",
            },
            include: {
              seenUsers: true,
              deliveredTo: true,
            },
          },
          users: true,
        },
      });

      return chat;
    }
  }

  async createGroup(
    fileName: string,
    name: string,
    users: string,
    loginUserId: number
  ) {
    const parsedUsers = (await JSON.parse(users)) as { id: number }[];

    const conversation = await this.prismaService.conversation.create({
      data: {
        name: name + `?${Math.random()}`,
        users: {
          connect: [...parsedUsers, { id: loginUserId }],
        },
        avatar: fileName,
        groupAdmins: {
          connect: [{ id: loginUserId }],
        },
        isGroup: true,
      },
      include: {
        groupAdmins: true,
        Message: true,
        users: true,
      },
    });

    //I wanna get users of this conversation that are online{Socket}
    //then manually add them to this new conversation room
    [...parsedUsers, { id: loginUserId }].forEach((user) => {
      if (this.eventGate.onlineUsers.has(user.id)) {
        this.eventGate.joinRoom(this.eventGate.onlineUsers.get(user.id), {
          roomName: conversation.name,
          userId: user.id,
        });
      }
    });

    //then broadcast this new new conversation to the room so online users will have the new chat
    const socketInstance = this.eventGate.onlineUsers.get(loginUserId);
    socketInstance
      ?.to(conversation.name)
      ?.emit("newConversation", conversation);

    return conversation;
  }

  async fetchConversations(currentLoginUserId: number) {
    const conversations = await this.prismaService.conversation.findMany({
      where: {
        users: {
          some: {
            id: currentLoginUserId,
          },
        },
      },
      take: 50,
      include: {
        Message: {
          include: {
            seenUsers: true,
            deliveredTo: true,
            sender: {
              select: { name: true, color: true },
            },
          },
        },

        groupAdmins: true,
        users: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const sortedConversations = conversations
      .map((conversation) => {
        const unSeenCount = conversation.Message.filter(
          (message) =>
            !message.seenUsers.some((user) => user.id === currentLoginUserId)
        ).length;

        return {
          ...conversation,
          unSeenCount,
        };
      })
      .sort((a, b) => b.unSeenCount - a.unSeenCount);

    return sortedConversations;
  }

  public async getRoomsUsersIsInto(userId: number) {
    const conversationUserIsInto =
      await this.prismaService.conversation.findMany({
        where: {
          users: {
            some: {
              id: userId,
            },
          },
        },
        select: {
          name: true,
          id: true,
        },
      });
    return conversationUserIsInto;
  }
}
