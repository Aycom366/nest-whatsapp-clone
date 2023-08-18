import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { User } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { UpdateType } from "./types";
import { SharedService } from "src/shared/shared.service";

interface IProp {
  userId: number;
  name?: string;
}

interface UpdateProps {
  loggedInUser: number;
  conversationId: number;
  name?: string;
  groupDescription?: string;
  avatar?: string;
  updateType: UpdateType;
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

      this.eventEmitter.emit("join.room", {
        conversation: chat,
        roomName: chat.name,
        users: [{ id: info.userId }, { id: currentLoginUserId }],
      });

      return chat;
    }
  }

  async removePhoto(userId: number, conversationId: number) {
    const updatedConversation = await this.prismaService.conversation.update({
      where: {
        id: conversationId,
        groupAdmins: {
          some: {
            id: userId,
          },
        },
      },
      data: {
        avatar: "",
        Message: {
          create: {
            senderId: userId,
            messageType: "Bot",
            message: "deleted this group's icon",
          },
        },
      },
      include: {
        Message: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (updatedConversation) {
      const socketInstane = this.sharedService.onlineUsers.get(userId);
      if (socketInstane)
        socketInstane
          .to(updatedConversation.name)
          .emit("updateConversationInformation", updatedConversation);
    }

    return updatedConversation;
  }

  async addParticipants(
    userId: number,
    conversationId: number,
    body: { participants: { userId: number; name: string }[] }
  ) {
    const conversation = await this.prismaService.conversation.update({
      where: {
        id: conversationId,
        groupAdmins: {
          some: { id: userId },
        },
      },
      data: {
        users: {
          connect: body.participants.map((user) => ({ id: user.userId })),
        },
        Message: {
          create: {
            senderId: userId,
            messageType: "Bot",
            message:
              body.participants.length > 1
                ? `added ${body.participants
                    .map((user, index) => {
                      if (index === body.participants.length - 1) {
                        return `and ${user.name}`;
                      } else {
                        return user.name;
                      }
                    })
                    .join(", ")}`
                : `added ${body.participants[0].name}`,
          },
        },
      },

      include: {
        users: true,
        Message: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (conversation) {
      const socketInstance = this.sharedService.onlineUsers.get(userId);
      if (socketInstance) {
        socketInstance
          .to(conversation.name)
          .emit("updateConversationInformation", conversation);
      }

      this.eventEmitter.emit("join.room", {
        roomName: conversation.name,
        users: [
          ...body.participants.map((user) => ({ id: user.userId })),
          { id: userId },
        ],
        conversation,
      });
    }
    return conversation;
  }

  async updateConversation(payload: UpdateProps) {
    const {
      name,
      loggedInUser,
      groupDescription,
      updateType,
      avatar,
      conversationId,
    } = payload;
    const conversation = await this.prismaService.conversation.findUnique({
      where: { id: conversationId },
      include: { groupAdmins: true, users: true },
    });
    if (!conversation) throw new NotFoundException("conversation not found");

    if (!conversation.groupAdmins.find((user) => user.id === loggedInUser))
      throw new ForbiddenException();

    const dataToUpdate = {
      ...(name && { name: name + `?${Math.random()}` }),
      ...(groupDescription && { groupDescription }),
      ...(avatar && { avatar }),
    };

    const updatedConversation = await this.prismaService.conversation.update({
      where: { id: conversationId },
      data: {
        ...dataToUpdate,
        Message: {
          create: {
            senderId: loggedInUser,
            messageType: "Bot",
            message:
              updateType === UpdateType.Avatar
                ? "changed this group's icon"
                : updateType === UpdateType.Name
                ? `changed the subject from "${
                    conversation.name.split("?")[0]
                  }" to "${name}"`
                : "changed the group description",
          },
        },
      },
      include: {
        Message: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (name) {
      //Then we have to update Rooms name with the newName that was just updated.
      this.eventEmitter.emit("room.update", {
        conversation: updatedConversation,
        oldRoomName: conversation.name,
        newRoomName: updatedConversation.name,
        userThatInitiate: loggedInUser,
        users: conversation.users,
      });
    } else {
      const socketInstane = this.sharedService.onlineUsers.get(loggedInUser);
      if (socketInstane)
        socketInstane
          .to(conversation.name)
          .emit("updateConversationInformation", updatedConversation);
    }

    return updatedConversation;
  }

  async createGroup(fileName: string, name: string, users: string, user: User) {
    const parsedUsers = (await JSON.parse(users)) as {
      id: number;
      name: string;
    }[];

    const conversation = await this.prismaService.conversation.create({
      data: {
        name: name + `?${Math.random()}`,
        users: {
          connect: [...parsedUsers, { id: user.id }],
        },
        avatar: fileName,
        groupAdmins: {
          connect: [{ id: user.id }],
        },
        createdById: user.id,
        Message: {
          create: {
            senderId: user.id,
            messageType: "Bot",
            message: `created group "${name}"`,
          },
        },

        isGroup: true,
      },
      include: {
        users: true,
        Message: {
          include: { sender: true, deliveredTo: true, seenUsers: true },
        },
        groupAdmins: true,
        createdBy: { select: { name: true, id: true } },
      },
    });

    this.eventEmitter.emit("join.room", {
      roomName: conversation.name,
      users: [...parsedUsers, { id: user.id }],
      conversation,
    });

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
        createdBy: { select: { name: true, id: true } },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const sortedConversations = conversations
      .map((conversation) => {
        const unSeenCount = conversation.Message.filter(
          (message) =>
            !message.seenUsers.some((user) => user.id === currentLoginUserId) &&
            message.messageType !== "Bot"
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
