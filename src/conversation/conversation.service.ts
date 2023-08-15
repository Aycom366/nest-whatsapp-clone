import { Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "src/prisma/prisma.service";
import { SharedService } from "src/shared/shared.service";

interface IProp {
  userId: number;
  name?: string;
}

@Injectable()
export class ConversationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly sharedService: SharedService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async accessConversation(info: IProp, currentLoginUserId: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id: info.userId },
    });
    if (!user) throw new NotFoundException();

    //check if currentLogin user in in conversation with this userId
    let chat = await this.prismaService.conversation.findFirst({
      where: {
        isGroup: false,
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

    this.eventEmitter.emit("join.room", {
      roomName: conversation.name,
      users: [...parsedUsers, { id: loginUserId }],
    });

    const socketInstance = this.sharedService.onlineUsers.get(loginUserId);
    if (socketInstance) {
      socketInstance
        .to(conversation.name)
        .emit("newConversation", conversation);
    }

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
