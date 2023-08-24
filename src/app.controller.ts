import {
  Body,
  Controller,
  Get,
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

const colors = [
  "#fc8393",
  "#f9526d",
  "#f6ad55",
  "#f38927",
  "#b5bfcc",
  "#792604",
  "#da610f",
  "#aa4109",
  "#34434b",
  "#3ea771",
  "#7ccfa1",
  "#4b5b68",
  "#13719b",
  "#627184",
  "#9fddbd",
  "#f6224b",
  "#2e825d",
  "#1f86c6",
  "#7b899d",
  "#58c184",
  "#1f5d46",
  "#8ecbf1",
  "#97a4b4",
  "#3994e0",
  "#ac99e7",
  "#211968",
  "#085970",
  "#fac185",
  "#8d71dc",
  "#dd0939",
  "#502fb7",
  "#63b1e8",
  "#ad0320",
  "#7248d0",
  "#7c000e",
];

@SkipAuth()
@Controller()
export class AppController {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService
  ) {}

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
            color: colors[Math.floor(Math.random() * colors.length)],
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

  @Get()
  rootEndpoint() {
    return "Whatsapp clone.";
  }
}
