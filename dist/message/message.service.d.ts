import { MessageType } from "@prisma/client";
import { EventGateway } from "src/event/event.gateway";
import { PrismaService } from "src/prisma/prisma.service";
interface IProps {
    messageType?: MessageType;
    message: string;
    conversationId: number;
}
export declare class MessageService {
    private readonly prismaService;
    private readonly eventGateway;
    constructor(prismaService: PrismaService, eventGateway: EventGateway);
    sendMessage(userId: number, body: IProps): Promise<{
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
        messageType: MessageType;
        messageStatus: import(".prisma/client").MessageStatus;
        message: string;
        createdAt: Date;
        conversationId: number;
    }, unknown> & {}>;
    fetchMessages(conversationId: number, loginUserId: number): Promise<({
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
        messageType: MessageType;
        messageStatus: import(".prisma/client").MessageStatus;
        message: string;
        createdAt: Date;
        conversationId: number;
    }, unknown> & {})[]>;
}
export {};
