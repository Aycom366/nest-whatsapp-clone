import { MessageType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from "class-validator";

export class CreateSingleConversation {
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}

class ParticipantDto {
  @IsNumber()
  @IsPositive()
  userId: number;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class AddParticipantsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants: ParticipantDto[];
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
