"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const jwt_1 = require("@nestjs/jwt");
const user_module_1 = require("./user/user.module");
const core_1 = require("@nestjs/core");
const auth_guards_1 = require("./guards/auth.guards");
const message_module_1 = require("./message/message.module");
const conversation_module_1 = require("./conversation/conversation.module");
let AppModule = exports.AppModule = class AppModule {
};
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            jwt_1.JwtModule.register({
                global: true,
                secret: process.env.SECRET,
                signOptions: { expiresIn: "1d" },
            }),
            prisma_module_1.PrismaModule,
            user_module_1.UserModule,
            message_module_1.MessageModule,
            conversation_module_1.ConversationModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: auth_guards_1.AuthGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map