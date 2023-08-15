import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Request,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { ConversationService } from "./conversation.service";
import { CreateSingleConversation } from "src/dtos/converseMessage.dto";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller("conversation")
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Post()
  accessConversation(
    @Body() body: CreateSingleConversation,
    @Request() request
  ) {
    return this.conversationService.accessConversation(body, request.user.id);
  }

  @Post("/group")
  @UseInterceptors(FileInterceptor("file"))
  async createGroupConversation(
    @UploadedFile() file: Express.Multer.File,
    @Body("users") users: string,
    @Body("name") name: string,
    @Request() request
  ) {
    if (!name || !users) throw new BadRequestException();
    let secureUrl = "";
    if (file) {
      const result = await this.cloudinaryService.uploadFile(file);
      secureUrl = result.secure_url;
    }
    return this.conversationService.createGroup(
      secureUrl,
      name,
      users,
      request.user
    );
  }

  @Get("conversations")
  fetchConversations(@Request() request) {
    return this.conversationService.fetchConversations(request.user.id);
  }
}
