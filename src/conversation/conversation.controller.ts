import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { ConversationService } from "./conversation.service";
import {
  AddParticipantsDto,
  CreateSingleConversation,
} from "src/dtos/converseMessage.dto";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { UpdateType } from "./types";

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

  @Patch("participant/add/:conversationId")
  addParticipants(
    @Body(ValidationPipe) body: AddParticipantsDto,
    @Param("conversationId", ParseIntPipe) conversationId: number,
    @Request() request
  ) {
    return this.conversationService.addParticipants(
      request.user.id,
      conversationId,
      body
    );
  }

  @Post("group")
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

  @Delete("photo/:conversationId")
  async removePhoto(
    @Request() request,
    @Param("conversationId", ParseIntPipe) conversationId: number
  ) {
    return this.conversationService.removePhoto(
      request.user.id,
      conversationId
    );
  }

  @Patch("group/:conversationId")
  @UseInterceptors(FileInterceptor("file"))
  async updateGroupConversation(
    @Request() request,
    @Body("updateType", new ParseEnumPipe(UpdateType)) updateType: UpdateType,
    @Param("conversationId", ParseIntPipe) conversationId: number,
    @UploadedFile()
    file?: Express.Multer.File,
    @Body("name") name?: string,
    @Body("groupDescription") groupDescription?: string
  ) {
    let avatar = "";
    if (file) {
      const result = await this.cloudinaryService.uploadFile(file);
      avatar = result.secure_url;
    }
    return this.conversationService.updateConversation({
      loggedInUser: request.user.id,
      name,
      updateType,
      conversationId,
      groupDescription,
      avatar,
    });
  }

  @Get("conversations")
  fetchConversations(@Request() request) {
    return this.conversationService.fetchConversations(request.user.id);
  }
}
