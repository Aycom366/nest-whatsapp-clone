import { Injectable, NotFoundException } from "@nestjs/common";
import { MessageType } from "@prisma/client";
import { EventGateway } from "src/event/event.gateway";
import { PrismaService } from "src/prisma/prisma.service";

interface IProps {
  messageType?: MessageType;
  message: string;
  conversationId: number;
}

@Injectable()
export class MessageService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventGateway: EventGateway
  ) {}

  async sendMessage(userId: number, body: IProps) {
    const conversation = await this.prismaService.conversation.findUnique({
      where: { id: body.conversationId },
      include: {
        users: true,
      },
    });
    if (!conversation) throw new NotFoundException();

    //Get users that are online that are in this conversation
    const usersInConversationExludingSender = conversation.users
      .filter((user) => user.id !== userId)
      .map((userData) => userData.id);

    const getSeenUsersfromOnlineList = usersInConversationExludingSender
      .filter((userId) => this.eventGateway.onlineUsers.has(userId))
      .map((item) => ({ id: item }));

    const message = await this.prismaService.message.create({
      include: {
        seenUsers: true,
        sender: true,
      },

      data: {
        message: body.message,
        conversationId: conversation.id,
        senderId: userId,
        messageStatus:
          getSeenUsersfromOnlineList.length > 0 ? "Delivered" : "Sent",

        seenUsers: {
          connect: getSeenUsersfromOnlineList,
        },
        messageType: body.messageType,
      },
    });

    const receivers = conversation.users.filter((user) => user.id !== userId);

    receivers.forEach((receiver) => {
      const userSocket = this.eventGateway.onlineUsers.get(receiver.id);

      if (userSocket) {
        this.eventGateway.server
          .to(userSocket.id)
          .emit("messageReceived", message);
      }
    });

    return message;
  }

  async fetchMessages(conversationId: number, loginUserId: number) {
    const doesConversationExist =
      await this.prismaService.conversation.findUnique({
        where: { id: conversationId },
      });

    if (!doesConversationExist) throw new NotFoundException();

    // Retrieve the messages that the current user hasn't seen yet and were sent by other users
    const unseenMessages = await this.prismaService.message.findMany({
      where: {
        conversationId,
        NOT: {
          seenUsers: {
            some: {
              id: loginUserId,
            },
          },
        },
        OR: [
          {
            senderId: {
              not: loginUserId,
            },
          },
        ],
      },
    });

    // Get the IDs of the unseen messages
    const unseenMessageIds = unseenMessages.map((message) => message.id);

    // Start a Prisma transaction
    await this.prismaService.$transaction([
      // Update the 'seenUsers' for each unseen message
      ...unseenMessageIds.map((messageId) =>
        this.prismaService.message.update({
          where: { id: messageId },
          data: {
            messageStatus: "Read",
            seenUsers: {
              connect: {
                id: loginUserId,
              },
            },
          },
        })
      ),
    ]);

    const allMessages = await this.prismaService.message.findMany({
      where: {
        conversationId,
      },
      include: {
        seenUsers: true,
        sender: true,
      },
    });

    return allMessages;
  }
}
