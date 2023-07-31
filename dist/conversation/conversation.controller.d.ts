import { ConversationService } from "./conversation.service";
import { CreateSingleConversation } from "src/dtos/converseMessage.dto";
export declare class ConversationController {
    private readonly conversationService;
    constructor(conversationService: ConversationService);
    accessConversation(body: CreateSingleConversation, request: any): Promise<{
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
    fetchConversations(request: any): Promise<({
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
