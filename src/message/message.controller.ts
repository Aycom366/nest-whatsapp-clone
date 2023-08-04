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
import {
  SendMessageDto,
  UpdateMessageStatus,
} from "src/dtos/converseMessage.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { renameSync } from "fs";
import { MessageType } from "@prisma/client";

@Controller("message")
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  sendMessage(@Body() body: SendMessageDto, @Request() request) {
    return this.messageService.sendMessage(request.user.id, body as any);
  }

  @Post("/file-upload/image")
  @UseInterceptors(
    FileInterceptor("file", {
      dest: "public/images",
    })
  )
  uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 })],
        errorHttpStatusCode: 400,
      })
    )
    file: Express.Multer.File,
    @Body("conversationId", ParseIntPipe) conversationId: number,
    @Body("messageType", new ParseEnumPipe(MessageType))
    messageType: MessageType,
    @Request() request
  ) {
    const fileName = "public/images/" + Date.now() + file.originalname;
    renameSync(file.path, fileName);

    return this.messageService.sendMessage(request.user.id, {
      conversationId,
      message: fileName,
      messageType: messageType,
    });
  }

  @Post("/file-upload/audio")
  @UseInterceptors(
    FileInterceptor("audio", {
      dest: "public/audio",
    })
  )
  uploadAudio(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 })],
        errorHttpStatusCode: 400,
      })
    )
    file: Express.Multer.File,
    @Body("conversationId", ParseIntPipe) conversationId: number,
    @Body("messageType", new ParseEnumPipe(MessageType))
    messageType: MessageType,
    @Request() request
  ) {
    const fileName = "public/audio/" + Date.now() + file.originalname;
    renameSync(file.path, fileName);

    return this.messageService.sendMessage(request.user.id, {
      conversationId,
      message: fileName,
      messageType: messageType,
    });
  }

  @Patch()
  updateMessageStatus(@Body() body: UpdateMessageStatus, @Request() request) {
    return this.messageService.updateMessageStatus(body, request.user.id);
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
