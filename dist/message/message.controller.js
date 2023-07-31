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
exports.MessageController = void 0;
const common_1 = require("@nestjs/common");
const message_service_1 = require("./message.service");
const converseMessage_dto_1 = require("../dtos/converseMessage.dto");
let MessageController = exports.MessageController = class MessageController {
    constructor(messageService) {
        this.messageService = messageService;
    }
    sendMessage(body, request) {
        return this.messageService.sendMessage(request.user.id, body);
    }
    fetchMessages(conversationId, request) {
        return this.messageService.fetchMessages(conversationId, request.user.id);
    }
};
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [converseMessage_dto_1.SendMessageDto, Object]),
    __metadata("design:returntype", void 0)
], MessageController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)(":conversationId"),
    __param(0, (0, common_1.Param)("conversationId", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], MessageController.prototype, "fetchMessages", null);
exports.MessageController = MessageController = __decorate([
    (0, common_1.Controller)("message"),
    __metadata("design:paramtypes", [message_service_1.MessageService])
], MessageController);
//# sourceMappingURL=message.controller.js.map