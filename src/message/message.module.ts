import { Module } from "@nestjs/common";
import { MessageController } from "./message.controller";
import { MessageService } from "./message.service";
import { EventModule } from "src/event/event.module";
import { CloudinaryModule } from "src/cloudinary/cloudinary.module";

@Module({
  imports: [EventModule, CloudinaryModule],
  controllers: [MessageController],
  providers: [MessageService],
})
export class MessageModule {}
