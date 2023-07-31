import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
} from "@nestjs/common";
import { MessageService } from "./message.service";
import { SendMessageDto } from "src/dtos/converseMessage.dto";

@Controller("message")
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  sendMessage(@Body() body: SendMessageDto, @Request() request) {
    return this.messageService.sendMessage(request.user.id, body as any);
  }

  @Get(":conversationId")
  fetchMessages(
    @Param("conversationId", ParseIntPipe) conversationId: number,
    @Request() request
  ) {
    return this.messageService.fetchMessages(conversationId, request.user.id);
  }
}
