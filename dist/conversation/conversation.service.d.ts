import { PrismaService } from "src/prisma/prisma.service";
export declare class ConversationService {
    private readonly prismaService;
    constructor(prismaService: PrismaService);
    accessConversation(userId: number, currentLoginUserId: number): Promise<{
        Message: (import("@prisma/client/runtime/library").GetResult<{
            id: number;
            senderId: number;
            messageType: import(".prisma/client").MessageType;
            messageStatus: import(".prisma/client").MessageStatus;
            message: string;
            createdAt: Date;
            conversationId: number;
        }, unknown> & {})[];
        users: (import("@prisma/client/runtime/library").GetResult<{
            id: number;
            email: string;
            picture: string;
            name: string;
        }, unknown> & {})[];
    } & import("@prisma/client/runtime/library").GetResult<{
        id: number;
        name: string;
        isGroup: boolean;
        createdAt: Date;
    }, unknown> & {}>;
    fetchConversations(currentLoginUserId: number): Promise<({
        Message: (import("@prisma/client/runtime/library").GetResult<{
            id: number;
            senderId: number;
            messageType: import(".prisma/client").MessageType;
            messageStatus: import(".prisma/client").MessageStatus;
            message: string;
            createdAt: Date;
            conversationId: number;
        }, unknown> & {})[];
    } & import("@prisma/client/runtime/library").GetResult<{
        id: number;
        name: string;
        isGroup: boolean;
        createdAt: Date;
    }, unknown> & {})[]>;
}
