import { Module } from "@nestjs/common";
import { EventGateway } from "./event.gateway";
import { ConversationModule } from "src/conversation/conversation.module";
import { MessageModule } from "src/message/message.module";

@Module({
  imports: [ConversationModule, MessageModule],
  providers: [EventGateway],
  exports: [EventGateway],
})
export class EventModule {}
