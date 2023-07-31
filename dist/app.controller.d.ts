import { LoginDto } from "./dtos";
import { PrismaService } from "./prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
export declare class AppController {
    private readonly prismaService;
    private readonly jwtService;
    constructor(prismaService: PrismaService, jwtService: JwtService);
    login(body: LoginDto): Promise<{
        id: number;
        email: string;
        picture: string;
        name: string;
        token: string;
    }>;
}
