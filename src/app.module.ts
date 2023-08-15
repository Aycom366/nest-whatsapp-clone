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
import { SharedModule } from "./shared/shared.module";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { EventModule } from "./event/event.module";

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.SECRET,
      signOptions: { expiresIn: "1d" },
    }),
    SharedModule,
    PrismaModule,
    UserModule,
    MessageModule,
    ConversationModule,
    EventModule,
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
