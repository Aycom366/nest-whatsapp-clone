import { Module, forwardRef } from "@nestjs/common";
import { EventGateway } from "./event.gateway";
import { ConversationModule } from "src/conversation/conversation.module";

@Module({
  imports: [ConversationModule],
  providers: [EventGateway],
  exports: [EventGateway],
})
export class EventModule {}
