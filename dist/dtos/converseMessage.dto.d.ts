import { MessageType } from "@prisma/client";
export declare class CreateSingleConversation {
    userId: number;
}
export declare class SendMessageDto {
    messageType?: MessageType;
    message: string;
    conversationId: number;
}
