import { Body, Controller, Get, Post, Request } from "@nestjs/common";
import { ConversationService } from "./conversation.service";
import { CreateSingleConversation } from "src/dtos/converseMessage.dto";

@Controller("conversation")
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  accessConversation(
    @Body() body: CreateSingleConversation,
    @Request() request
  ) {
    return this.conversationService.accessConversation(body, request.user.id);
  }

  @Get("conversations")
  fetchConversations(@Request() request) {
    return this.conversationService.fetchConversations(request.user.id);
  }
}
