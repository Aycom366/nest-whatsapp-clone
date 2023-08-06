import { MessageType } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";

export class CreateSingleConversation {
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}

export class UpdateMessageStatus {
  @IsNumber()
  messageId: number;
}

export class SendMessageDto {
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsNumber()
  @IsPositive()
  conversationId: number;
}
