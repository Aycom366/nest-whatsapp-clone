"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const user_service_1 = require("./user.service");
const prisma_service_1 = require("../prisma/prisma.service");
let UserController = exports.UserController = class UserController {
    constructor(userService, prismaService) {
        this.userService = userService;
        this.prismaService = prismaService;
    }
    async getAllUser(request) {
        const user = await this.prismaService.user.findMany({
            orderBy: { name: "asc" },
            where: {
                NOT: {
                    email: request.user.email,
                },
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
};
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getAllUser", null);
exports.UserController = UserController = __decorate([
    (0, common_1.Controller)("user"),
    __metadata("design:paramtypes", [user_service_1.UserService,
        prisma_service_1.PrismaService])
], UserController);
//# sourceMappingURL=user.controller.js.map