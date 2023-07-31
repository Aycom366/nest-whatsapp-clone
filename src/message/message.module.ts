import { Module } from "@nestjs/common";
import { MessageController } from "./message.controller";
import { MessageService } from "./message.service";
import { EventModule } from "src/event/event.module";

@Module({
  imports: [EventModule],
  controllers: [MessageController],
  providers: [MessageService],
})
export class MessageModule {}
