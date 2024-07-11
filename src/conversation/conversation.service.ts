import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
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

const userSelect = {
  select: {
    id: true,
    name: true,
    color: true,
    email: true,
    isGoogle: true,
    picture: true,
  },
};

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

  async SaveBotMessage(
    conversationId: number,
    BotMessageToId: number,
    message: string
  ) {
    const newMessage = await this.prismaService.message.create({
      data: {
        conversationId,
        message,
        messageType: "Bot",
        BotMessageToId,
      },
      include: {
        seenUsers: userSelect,
        deliveredTo: userSelect,
        BotMessageTo: userSelect,
        sender: userSelect,
      },
    });

    return newMessage;
  }

  async updateAdmin(
    body: { name: string; userId: number },
    conversationId: number,
    type: "add" | "remove",
    loggedInUser: number
  ) {
    const conversation = await this.prismaService.conversation.update({
      where: {
        id: conversationId,
        groupAdmins: { some: { id: loggedInUser } },
      },
      data: {
        groupAdmins:
          type === "add"
            ? {
                connect: { id: body.userId },
              }
            : {
                disconnect: { id: body.userId },
              },
        Message: {
          create: {
            senderId: loggedInUser,
            messageType: "Bot",
            message:
              type === "add"
                ? "You are now an Admin"
                : "You are no longer an Admin",
            BotMessageToId: body.userId,
          },
        },
      },
      include: {
        groupAdmins: userSelect,

        Message: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            seenUsers: userSelect,
            deliveredTo: userSelect,
            BotMessageTo: userSelect,
            sender: userSelect,
          },
        },
      },
    });
    if (conversation) {
      const socketInstane = this.sharedService.onlineUsers.get(loggedInUser);
      if (socketInstane)
        socketInstane
          .to(conversation.name)
          .emit("updateConversationInformation", conversation);
    }

    return conversation;
  }

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
            seenUsers: userSelect,
            deliveredTo: userSelect,
            BotMessageTo: userSelect,
          },
        },
        users: userSelect,
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
              seenUsers: userSelect,
              deliveredTo: userSelect,
              BotMessageTo: userSelect,
            },
          },
          users: userSelect,
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

  async exitGroup(
    body: { name: string; userId: number },
    conversationId: number
  ) {
    const conversation = await this.prismaService.conversation.findUnique({
      where: { id: conversationId },
      include: { groupAdmins: true, users: true },
    });
    if (!conversation) throw new NotFoundException();

    if (
      conversation.groupAdmins.find((user) => user.id === body.userId) &&
      conversation.groupAdmins.length === 1 &&
      conversation.users.length > 1
    )
      throw new UnprocessableEntityException(
        "Please make another user an admin before exiting the group"
      );

    const newConversation = await this.prismaService.conversation.update({
      where: { id: conversationId },
      data: {
        users: { disconnect: { id: body.userId } },
        groupAdmins: { disconnect: { id: body.userId } },
        Message: {
          create: {
            senderId: body.userId,
            messageType: "Bot",
            message: "left groupchat",
          },
        },
      },
      include: {
        users: userSelect,
        groupAdmins: userSelect,
        Message: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            seenUsers: userSelect,
            deliveredTo: userSelect,
            BotMessageTo: userSelect,
            sender: userSelect,
          },
        },
      },
    });

    if (newConversation) {
      this.eventEmitter.emit("room.removeUser", {
        roomName: conversation.name,
        users: [{ id: body.userId }, { id: body.userId }],
        conversation: newConversation,
      });

      return newConversation;
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
          include: {
            seenUsers: userSelect,
            deliveredTo: userSelect,
            BotMessageTo: userSelect,
            sender: userSelect,
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

  async updateConversationParticipants(
    userId: number,
    action: "add" | "remove",
    conversationId: number,
    body: { participants: { userId: number; name: string }[] }
  ) {
    let message = "";
    if (body.participants.length > 1) {
      const names = body.participants.map((user) => user.name);
      const lastParticipant = names.pop();
      message = `added ${names.join(", ")} and ${lastParticipant}`;
    } else if (body.participants.length === 1) {
      message = `added ${body.participants[0].name}`;
    }

    const conversation = await this.prismaService.conversation.update({
      where: {
        id: conversationId,
        groupAdmins: {
          some: { id: userId },
        },
      },
      data: {
        users:
          action === "add"
            ? {
                connect: body.participants.map((user) => ({ id: user.userId })),
              }
            : { disconnect: { id: body.participants[0].userId } },
        groupAdmins:
          action === "remove"
            ? { disconnect: { id: body.participants[0].userId } }
            : {},
        Message: {
          create: {
            senderId: userId,
            messageType: "Bot",
            message:
              action === "add"
                ? message
                : `removed ${body.participants[0].name}`,
          },
        },
      },

      include: {
        users: userSelect,
        groupAdmins: userSelect,
        Message: {
          include: {
            seenUsers: userSelect,
            deliveredTo: userSelect,
            BotMessageTo: userSelect,
            sender: userSelect,
          },
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (conversation) {
      if (action === "add") {
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
      } else {
        this.eventEmitter.emit("room.removeUser", {
          roomName: conversation.name,
          users: [{ id: body.participants[0].userId }, { id: userId }],
          conversation,
        });
      }

      return conversation;
    }
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
      include: { groupAdmins: userSelect, users: userSelect },
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
          include: {
            seenUsers: userSelect,
            deliveredTo: userSelect,
            BotMessageTo: userSelect,
            sender: userSelect,
          },
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
        users: userSelect,
        Message: {
          include: {
            sender: userSelect,
            deliveredTo: userSelect,
            seenUsers: userSelect,
            BotMessageTo: userSelect,
          },
        },
        groupAdmins: userSelect,
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
      include: {
        Message: {
          include: {
            seenUsers: userSelect,
            deliveredTo: userSelect,
            BotMessageTo: userSelect,
            sender: {
              select: { name: true, color: true },
            },
          },
        },

        groupAdmins: userSelect,
        users: userSelect,
        createdBy: { select: { name: true, id: true } },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    const sortedConversations = conversations
      .map((conversation) => {
        let mostRecentMessageTimestamp = 0;
        let mostRecentMessage = null;

        if (conversation.Message.length > 0) {
          mostRecentMessage = conversation.Message.reduce(
            (mostRecent, current) =>
              current.createdAt > mostRecent.createdAt ? current : mostRecent
          );
          mostRecentMessageTimestamp = mostRecentMessage.createdAt.getTime();
        }

        return {
          ...conversation,
          mostRecentMessageTimestamp,
        };
      })
      .sort(
        (a, b) => b.mostRecentMessageTimestamp - a.mostRecentMessageTimestamp
      );

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
