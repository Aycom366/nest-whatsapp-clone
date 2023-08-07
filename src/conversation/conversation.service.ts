import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

interface IProp {
  userId: number;
  name?: string;
}

@Injectable()
export class ConversationService {
  constructor(private readonly prismaService: PrismaService) {}

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

  async fetchConversations(currentLoginUserId: number) {
    const conversation = this.prismaService.conversation.findMany({
      where: {
        users: {
          some: {
            id: currentLoginUserId,
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
      orderBy: {
        createdAt: "desc",
      },
    });
    return conversation;
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
