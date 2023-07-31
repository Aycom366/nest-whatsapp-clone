import {
  Body,
  Controller,
  InternalServerErrorException,
  Post,
} from "@nestjs/common";
import { OAuth2Client } from "google-auth-library";
import { LoginDto } from "./dtos";
import { PrismaService } from "./prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { SkipAuth } from "./decorators/skipAuth.decorator";

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

@Controller()
export class AppController {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  @SkipAuth()
  @Post("/login")
  async login(@Body() body: LoginDto) {
    try {
      const ticket = await client.verifyIdToken({
        idToken: body.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const googledata = ticket.getPayload();
      const user = await this.prismaService.user.findUnique({
        where: { email: googledata.email },
      });

      if (!user) {
        const newUser = await this.prismaService.user.create({
          data: {
            email: googledata.email,
            name: googledata.name,
            picture: googledata.picture,
          },
        });

        const token = await this.jwtService.signAsync(newUser);

        return { token, ...newUser };
      }

      const token = await this.jwtService.signAsync(user);

      return { token, ...user };
    } catch (error) {
      throw new InternalServerErrorException("An error has occured", error);
    }
  }
}
