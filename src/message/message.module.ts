import { Module } from "@nestjs/common";
import { MessageController } from "./message.controller";
import { MessageService } from "./message.service";
import { CloudinaryModule } from "src/cloudinary/cloudinary.module";

@Module({
  imports: [CloudinaryModule],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
