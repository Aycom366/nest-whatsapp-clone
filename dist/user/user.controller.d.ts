import { UserService } from "./user.service";
import { PrismaService } from "src/prisma/prisma.service";
export declare class UserController {
    private readonly userService;
    private readonly prismaService;
    constructor(userService: UserService, prismaService: PrismaService);
    getAllUser(request: any): Promise<{}>;
}
