import { Module } from "@nestjs/common";
import { ConversationController } from "./conversation.controller";
import { ConversationService } from "./conversation.service";
import { EventModule } from "src/event/event.module";

@Module({
  imports: [EventModule],
  controllers: [ConversationController],
  providers: [ConversationService],
})
export class ConversationModule {}
