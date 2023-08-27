import {
  Body,
  Controller,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseEnumPipe,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { MessageService } from "./message.service";
import { SendMessageDto } from "src/dtos/converseMessage.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { MessageType } from "@prisma/client";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";

@Controller("message")
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Post()
  sendMessage(@Body() body: SendMessageDto, @Request() request) {
    return this.messageService.sendMessage(request.user.id, body as any);
  }

  @Patch()
  updateMessagesStatus(
    @Body() body: { messagesId: number[] },
    @Request() request
  ) {
    return this.messageService.updateMessagesStatus({
      messageIds: body.messagesId,
      userId: request.user.id,
    });
  }

  @Post("/file-upload/image")
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 })],
        errorHttpStatusCode: 400,
      })
    )
    file: Express.Multer.File,
    @Body("conversationId", ParseIntPipe) conversationId: number,
    @Body("messageType", new ParseEnumPipe(MessageType))
    messageType: MessageType,
    @Request() request
  ) {
    const cloud = await this.cloudinaryService.uploadFile(file);
    return this.messageService.sendMessage(request.user.id, {
      conversationId,
      message: cloud.secure_url,
      messageType: messageType,
    });
  }

  @Post("/file-upload/audio")
  @UseInterceptors(FileInterceptor("audio"))
  async uploadAudio(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 2 })],
        errorHttpStatusCode: 400,
      })
    )
    file: Express.Multer.File,
    @Body("conversationId", ParseIntPipe) conversationId: number,
    @Body("messageType", new ParseEnumPipe(MessageType))
    messageType: MessageType,
    @Request() request
  ) {
    const cloud = await this.cloudinaryService.uploadFile(file);
    return this.messageService.sendMessage(request.user.id, {
      conversationId,
      message: cloud.secure_url,
      messageType: messageType,
    });
  }

  @Patch("/deliver")
  updateMessageStatusToDeliver(@Request() request) {
    return this.messageService.updateMessageStatusToDeliver(request.user.id);
  }

  @Get(":conversationId")
  fetchMessages(
    @Param("conversationId", ParseIntPipe) conversationId: number,
    @Request() request
  ) {
    return this.messageService.fetchMessages(conversationId, request.user.id);
  }
}
