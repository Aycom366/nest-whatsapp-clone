import { Test, TestingModule } from "@nestjs/testing";
import { UserController } from "./user.controller";
import { PrismaService } from "src/prisma/prisma.service";
import { UserService } from "./user.service";

const UserResponse = {
  A: [
    {
      id: 1,
      email: "bamigboyeayomide200@gmail.com",
      picture:
        "https://lh3.googleusercontent.com/a/AAcHTtdTXIxRsG7BxhpBTGiFFuJxdkIaJrunUxOTk23qu3zaJpY=s96-c",
      name: "Ayomide Bamigboye",
    },
  ],
};

describe("UserController", () => {
  let controller: UserController;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            getAllUser: jest.fn().mockReturnValue([UserResponse]),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
