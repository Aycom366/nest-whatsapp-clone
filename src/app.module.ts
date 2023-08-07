import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { JwtModule } from "@nestjs/jwt";
import { UserModule } from "./user/user.module";
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "./guards/auth.guards";
import { MessageModule } from "./message/message.module";
import { ConversationModule } from "./conversation/conversation.module";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "public"),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.SECRET,
      signOptions: { expiresIn: "1d" },
    }),
    PrismaModule,
    UserModule,
    MessageModule,
    ConversationModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
