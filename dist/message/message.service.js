"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageService = void 0;
const common_1 = require("@nestjs/common");
const event_gateway_1 = require("../event/event.gateway");
const prisma_service_1 = require("../prisma/prisma.service");
let MessageService = exports.MessageService = class MessageService {
    constructor(prismaService, eventGateway) {
        this.prismaService = prismaService;
        this.eventGateway = eventGateway;
    }
    async sendMessage(userId, body) {
        const conversation = await this.prismaService.conversation.findUnique({
            where: { id: body.conversationId },
            include: {
                users: true,
            },
        });
        if (!conversation)
            throw new common_1.NotFoundException();
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
                messageStatus: getSeenUsersfromOnlineList.length > 0 ? "Delivered" : "Sent",
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
    async fetchMessages(conversationId, loginUserId) {
        const doesConversationExist = await this.prismaService.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!doesConversationExist)
            throw new common_1.NotFoundException();
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
        const unseenMessageIds = unseenMessages.map((message) => message.id);
        await this.prismaService.$transaction([
            ...unseenMessageIds.map((messageId) => this.prismaService.message.update({
                where: { id: messageId },
                data: {
                    messageStatus: "Read",
                    seenUsers: {
                        connect: {
                            id: loginUserId,
                        },
                    },
                },
            })),
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
};
exports.MessageService = MessageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_gateway_1.EventGateway])
], MessageService);
//# sourceMappingURL=message.service.js.map