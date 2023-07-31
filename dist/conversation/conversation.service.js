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
exports.ConversationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ConversationService = exports.ConversationService = class ConversationService {
    constructor(prismaService) {
        this.prismaService = prismaService;
    }
    async accessConversation(userId, currentLoginUserId) {
        const user = await this.prismaService.user.findUnique({
            where: { id: userId },
        });
        if (!user)
            throw new common_1.NotFoundException();
        let chat = await this.prismaService.conversation.findFirst({
            where: {
                isGroup: false,
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
        }
        else {
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
    async fetchConversations(currentLoginUserId) {
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
};
exports.ConversationService = ConversationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConversationService);
//# sourceMappingURL=conversation.service.js.map