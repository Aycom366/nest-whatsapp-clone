import { Module, forwardRef } from "@nestjs/common";
import { ConversationController } from "./conversation.controller";
import { ConversationService } from "./conversation.service";
import { CloudinaryModule } from "src/cloudinary/cloudinary.module";
import { EventModule } from "src/event/event.module";

@Module({
  imports: [CloudinaryModule, forwardRef(() => EventModule)],
  controllers: [ConversationController],
  providers: [ConversationService],
})
export class ConversationModule {}
