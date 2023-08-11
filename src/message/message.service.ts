import { Injectable, NotFoundException } from "@nestjs/common";
import { MessageType } from "@prisma/client";
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

  async sendMessage(userId: number, body: IProps) {
    const conversation = await this.prismaService.conversation.findUnique({
      where: { id: body.conversationId },
      include: {
        users: true,
      },
    });
    if (!conversation) throw new NotFoundException();

    const globalOnlineUsers = Array.from(this.eventGateway.onlineUsers.keys());

    const seenUsers = globalOnlineUsers
      .filter(
        (id) =>
          id !== userId &&
          this.eventGateway.currentChatId.get(id) === conversation.id &&
          this.eventGateway.roomsMap.get(conversation.name).has(id)
      )
      .map((id) => ({ id }));

    const message = await this.prismaService.message.create({
      include: {
        seenUsers: true,
        deliveredTo: true,
        sender: true,
      },
      data: {
        message: body.message,
        conversationId: conversation.id,
        senderId: userId,
        deliveredTo: {
          connect: globalOnlineUsers
            .filter(
              (id) =>
                id !== userId &&
                conversation.users.some((data) => data.id === id)
            )
            .map((id) => ({ id })),
        },
        seenUsers: {
          connect: seenUsers,
        },
        messageType: body.messageType,
      },
    });

    const socketInstance = this.eventGateway.onlineUsers.get(userId);

    if (socketInstance)
      socketInstance.to(conversation.name).emit("messageReceived", message);

    return message;
  }

  async updateMessageStatus(body: UpdateMessageStatusProps, userId: number) {
    const existingMessage = await this.prismaService.message.findUnique({
      where: { id: body.messageId },
      select: {
        conversationId: true,
        deliveredTo: { select: { id: true } },
        seenUsers: { select: { id: true } },
        senderId: true,
      },
    });
    if (!existingMessage) throw new NotFoundException();

    const conversationData = await this.prismaService.conversation.findUnique({
      where: { id: existingMessage.conversationId },
      select: {
        users: {
          select: { id: true },
        },
        id: true,
        name: true,
      },
    });

    const globalOnlineUsers = Array.from(this.eventGateway.onlineUsers.keys());

    const seenUsers = globalOnlineUsers
      .filter(
        (id) =>
          this.eventGateway.currentChatId.get(id) === conversationData.id &&
          existingMessage.senderId !== id &&
          this.eventGateway.roomsMap.get(conversationData.name).has(id)
      )
      .map((id) => ({ id }));

    const newMessage = await this.prismaService.message.update({
      where: { id: body.messageId },
      data: {
        deliveredTo: {
          connect: {
            id: userId,
          },
        },
        seenUsers: {
          connect: seenUsers,
        },
      },
      include: {
        seenUsers: true,
        sender: true,
        deliveredTo: true,
      },
    });

    //send an emit event to everyone including the user who update
    this.eventGateway.server
      .to(conversationData.name)
      .emit("updateMessageStatus", newMessage);
  }

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
              deliveredTo: {
                some: {
                  id: loginUserId,
                },
              },
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

      include: {
        conversation: {
          select: {
            name: true,
            id: true,
            users: true,
          },
        },
        deliveredTo: { select: { id: true } },
        seenUsers: { select: { id: true } },
      },
    });

    const conversationName = new Set<string>();

    // Start a Prisma transaction
    const updatedMessages = await this.prismaService.$transaction([
      // Update the 'messageStatus' for each message
      ...unseenMessages.map((message) => {
        conversationName.add(message.conversation.name);
        return this.prismaService.message.update({
          where: { id: message.id },
          data: {
            deliveredTo: message.conversation.users.find(
              (user) => user.id === loginUserId
            )
              ? {
                  connect: { id: loginUserId },
                }
              : {},
          },
          include: {
            conversation: {
              select: {
                name: true,
              },
            },
            deliveredTo: true,
            seenUsers: true,
          },
        });
      }),
    ]);

    Array.from(conversationName).forEach(
      (name) =>
        this.eventGateway.server
          .to(name)
          .emit("messagesDeliver", updatedMessages) //send to all users connected to the room
    );

    return updatedMessages;
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
          AND: [
            {
              seenUsers: {
                some: {
                  id: loginUserId,
                },
              },
            },
            {
              deliveredTo: {
                some: {
                  id: loginUserId,
                },
              },
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
      take: 50,
      include: {
        conversation: {
          select: {
            name: true,
            id: true,
            users: true,
          },
        },
        deliveredTo: { select: { id: true } },
        seenUsers: { select: { id: true } },
      },
    });

    const conversationName = new Set<string>();

    const updatedMessages = await this.prismaService.$transaction([
      ...unseenMessages.map((message) => {
        conversationName.add(message.conversation.name);
        return this.prismaService.message.update({
          where: { id: message.id },
          data: {
            //Ensure loginUser are in the conversation object
            deliveredTo: message.conversation.users.find(
              (user) => user.id === loginUserId
            )
              ? {
                  connect: { id: loginUserId },
                }
              : {},
            seenUsers: message.conversation.users.find(
              (user) => user.id === loginUserId
            )
              ? {
                  connect: { id: loginUserId },
                }
              : {},
          },
          include: {
            deliveredTo: true,
            seenUsers: true,
          },
        });
      }),
    ]);

    Array.from(conversationName).forEach(
      (name) =>
        this.eventGateway.server
          .to(name)
          .emit("messagesDeliver", updatedMessages) //send to all users connected to the room
    );

    const allMessages = await this.prismaService.message.findMany({
      where: {
        conversationId,
      },
      include: {
        seenUsers: true,
        deliveredTo: true,
        sender: true,
      },
    });

    return allMessages;
  }
}
