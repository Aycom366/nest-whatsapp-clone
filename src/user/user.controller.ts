import { Controller, Get, Request } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Controller("user")
export class UserController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  async getAllUser(@Request() request) {
    const user = await this.prismaService.user.findMany({
      orderBy: { name: "asc" },
      where: {
        NOT: {
          email: request.user.email,
        },
      },
      select: {
        id: true,
        color: true,
        email: true,
        name: true,
        picture: true,
      },
    });

    const userGroupByInitialLetter = {};

    user.forEach((user) => {
      const initialLetter = user.name.charAt(0).toUpperCase();
      if (!userGroupByInitialLetter[initialLetter]) {
        userGroupByInitialLetter[initialLetter] = [];
      }
      userGroupByInitialLetter[initialLetter].push(user);
    });

    return userGroupByInitialLetter;
  }
}
