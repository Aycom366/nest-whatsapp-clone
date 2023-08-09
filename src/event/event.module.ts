import { Module } from "@nestjs/common";
import { EventGateway } from "./event.gateway";
import { ConversationService } from "src/conversation/conversation.service";

@Module({
  providers: [EventGateway, ConversationService],
  exports: [EventGateway],
})
export class EventModule {}
