import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { OAuth2Client } from "google-auth-library";
import * as bcryptjs from "bcryptjs";

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

interface SignupProps {
  name: string;
  email: string;
  password: string;
  profileUrl?: string;
}

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

@Injectable()
export class AppService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async signup(payload: SignupProps) {
    const doesUserExist = await this.prismaService.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    });

    if (doesUserExist)
      throw new ConflictException("Email has been used, Please login. ");

    const hashedPassword = await bcryptjs.hash(payload.password, 10);
    const user = await this.prismaService.user.create({
      data: {
        email: payload.email.toLowerCase(),
        name: payload.name,
        isGoogle: false,
        picture: payload.profileUrl,
        color: colors[Math.floor(Math.random() * colors.length)],
        password: hashedPassword,
      },
    });
    const { password, ...rest } = user;
    return { ...rest };
  }

  async credentialsLogin({
    email,
    password,
  }: Pick<SignupProps, "email" | "password">) {
    const user = await this.prismaService.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) throw new NotFoundException("Invalid password or email");

    if (user.isGoogle)
      throw new UnprocessableEntityException("Please Login with google");

    const hashedPassword = user.password;
    const isValidatePassword = await bcryptjs.compare(password, hashedPassword);

    if (!isValidatePassword)
      throw new NotFoundException("Invalid password or email");

    const { password: userPassword, ...rest } = user;
    const token = await this.jwtService.signAsync(rest);
    return { token, ...rest };
  }

  async googleLogin(idToken: string) {
    try {
      const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const googledata = ticket.getPayload();
      const user = await this.prismaService.user.findUnique({
        where: { email: googledata.email },
      });

      if (!user) {
        const newUser = await this.prismaService.user.create({
          data: {
            email: googledata.email.toLowerCase(),
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
}
