import {
  Body,
  Controller,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { CredentialsDto, LoginDto } from "./dtos";

import { SkipAuth } from "./decorators/skipAuth.decorator";
import { AppService } from "./app.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { CloudinaryService } from "./cloudinary/cloudinary.service";

@SkipAuth()
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Post("/login/google")
  async googleLogin(@Body() body: LoginDto) {
    return this.appService.googleLogin(body.idToken);
  }

  @Post("/login/credentials")
  async credentialsLogin(@Body() body: CredentialsDto) {
    return this.appService.credentialsLogin(body);
  }

  @Post("/signup")
  @UseInterceptors(FileInterceptor("file"))
  async signup(
    @Body("name") name: string,
    @Body("email") email: string,
    @Body("password") password: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 })],
        fileIsRequired: false,
      })
    )
    file?: Express.Multer.File
  ) {
    let profileUrl: "";
    if (file) {
      const result = await this.cloudinaryService.uploadFile(file);
      profileUrl = result.secure_url;
    }
    return this.appService.signup({
      name,
      email,
      password,
      profileUrl,
    });
  }

  @Get()
  rootEndpoint() {
    return "Whatsapp clone.";
  }
}
