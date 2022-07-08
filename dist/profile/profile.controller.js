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
exports.ProfileController = void 0;
const common_1 = require("@nestjs/common");
const profile_service_1 = require("./profile.service");
const swagger_1 = require("@nestjs/swagger");
const profile_dto_1 = require("./dto/profile.dto");
const jwt_auth_guard_1 = require("../auth/strategy/jwt-auth.guard");
const jwt_1 = require("@nestjs/jwt");
let ProfileController = class ProfileController {
    constructor(profileService, jwtService) {
        this.profileService = profileService;
        this.jwtService = jwtService;
    }
    async getUser(res, req) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true });
        const profile = await this.profileService.getProfile(json.id);
        res.json(profile);
    }
    async updateUser(res, req, body) {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const json = this.jwtService.decode(jwt, { json: true });
        const user = await this.profileService.updateProfile(json.id, body);
        res.json(user);
    }
};
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('/'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getUser", null);
__decorate([
    (0, common_1.Patch)('/'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, profile_dto_1.ProfileDTO]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "updateUser", null);
ProfileController = __decorate([
    (0, swagger_1.ApiTags)('profile'),
    (0, common_1.Controller)('profile'),
    __metadata("design:paramtypes", [profile_service_1.ProfileService,
        jwt_1.JwtService])
], ProfileController);
exports.ProfileController = ProfileController;
//# sourceMappingURL=profile.controller.js.map