import { MessageService } from "./message.service";
import { SendMessageDto } from "src/dtos/converseMessage.dto";
export declare class MessageController {
    private readonly messageService;
    constructor(messageService: MessageService);
    sendMessage(body: SendMessageDto, request: any): Promise<{
        seenUsers: (import("@prisma/client/runtime/library").GetResult<{
            id: number;
            email: string;
            picture: string;
            name: string;
        }, unknown> & {})[];
        sender: import("@prisma/client/runtime/library").GetResult<{
            id: number;
            email: string;
            picture: string;
            name: string;
        }, unknown> & {};
    } & import("@prisma/client/runtime/library").GetResult<{
        id: number;
        senderId: number;
        messageType: import(".prisma/client").MessageType;
        messageStatus: import(".prisma/client").MessageStatus;
        message: string;
        createdAt: Date;
        conversationId: number;
    }, unknown> & {}>;
    fetchMessages(conversationId: number, request: any): Promise<({
        seenUsers: (import("@prisma/client/runtime/library").GetResult<{
            id: number;
            email: string;
            picture: string;
            name: string;
        }, unknown> & {})[];
        sender: import("@prisma/client/runtime/library").GetResult<{
            id: number;
            email: string;
            picture: string;
            name: string;
        }, unknown> & {};
    } & import("@prisma/client/runtime/library").GetResult<{
        id: number;
        senderId: number;
        messageType: import(".prisma/client").MessageType;
        messageStatus: import(".prisma/client").MessageStatus;
        message: string;
        createdAt: Date;
        conversationId: number;
    }, unknown> & {})[]>;
}
