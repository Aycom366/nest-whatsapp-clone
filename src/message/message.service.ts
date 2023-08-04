import { Injectable, NotFoundException } from "@nestjs/common";
import { MessageStatus, MessageType } from "@prisma/client";
import { EventGateway } from "src/event/event.gateway";
import { PrismaService } from "src/prisma/prisma.service";

interface IProps {
  messageType?: MessageType;
  message: string;
  conversationId: number;
}

interface UpdateMessageStatusProps {
  messageId: number;
}

@Injectable()
export class MessageService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventGateway: EventGateway
  ) {}

  async updateMessageStatusToDeliver(loginUserId: number) {
    // Retrieve the messages that the current user hasn't seen yet and were sent by other users and the messageStatus is not delivered
    const unseenMessages = await this.prismaService.message.findMany({
      where: {
        NOT: {
          AND: [
            {
              seenUsers: {
                some: {
                  id: loginUserId,
                },
              },
            },
            {
              messageStatus: "Delivered",
            },
            {
              messageStatus: "Read",
            },
          ],
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
    const updatedMessage = await this.prismaService.$transaction([
      // Update the 'messageStatus' for each message
      ...unseenMessageIds.map((messageId) =>
        this.prismaService.message.update({
          where: { id: messageId },
          data: {
            messageStatus: "Delivered",
          },
        })
      ),
    ]);
    return updatedMessage;
  }

  async sendMessage(userId: number, body: IProps) {
    const conversation = await this.prismaService.conversation.findUnique({
      where: { id: body.conversationId },
      include: {
        users: true,
      },
    });
    if (!conversation) throw new NotFoundException();

    //Get users that are online that are in this conversation
    const onlineUsersInRoom = this.eventGateway
      .getOnlineUsersInRoom(conversation.name)
      .filter((user) => user !== userId)
      .map((item) => ({ id: item }));

    const globalOnlineUsers = Array.from(this.eventGateway.onlineUsers.keys())
      .filter((id) => id !== userId)
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
        messageStatus: globalOnlineUsers.length > 0 ? "Delivered" : "Sent",
        seenUsers: {
          connect: onlineUsersInRoom,
        },
        messageType: body.messageType,
      },
    });

    const socketInstance = this.eventGateway.onlineUsers.get(userId);

    socketInstance.to(conversation.name).emit("messageReceived", message);

    return message;
  }

  async updateMessageStatus(body: UpdateMessageStatusProps, userId: number) {
    const existingMessage = await this.prismaService.message.findUnique({
      where: { id: body.messageId },
      select: { seenUsers: true, conversationId: true },
    });
    if (!existingMessage) throw new NotFoundException();

    const conversationData = await this.prismaService.conversation.findUnique({
      where: { id: existingMessage.conversationId },
    });

    const newMessage = await this.prismaService.message.update({
      where: { id: body.messageId },
      data: {
        messageStatus: "Read",
        seenUsers: {
          connect: {
            id: userId,
          },
        },
      },
      include: {
        seenUsers: true,
        sender: true,
      },
    });

    //send an emit event to everyone including the user who update
    this.eventGateway.server
      .to(conversationData.name)
      .emit("updateMessageStatus", newMessage);
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
