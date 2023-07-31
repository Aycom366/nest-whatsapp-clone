import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class ConversationService {
  constructor(private readonly prismaService: PrismaService) {}

  async accessConversation(userId: number, currentLoginUserId: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException();

    //check if currentLogin user in in conversation with this userId
    let chat = await this.prismaService.conversation.findFirst({
      where: {
        isGroup: false, // Check if isGroup is false
        users: {
          every: {
            id: { in: [userId, currentLoginUserId] },
          },
        },
      },
      include: {
        Message: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        users: true,
      },
    });

    if (chat) {
      return chat;
    } else {
      chat = await this.prismaService.conversation.create({
        data: {
          name: user.name,
          users: {
            connect: [
              {
                id: userId,
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
            take: 1,
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
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return conversation;
  }
}
