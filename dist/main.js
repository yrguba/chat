"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const auth_module_1 = require("./auth/auth.module");
const profile_module_1 = require("./profile/profile.module");
const chats_module_1 = require("./chats/chats.module");
const users_module_1 = require("./users/users.module");
const swagger_1 = require("@nestjs/swagger");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableVersioning({
        type: common_1.VersioningType.URI,
    });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new common_1.ValidationPipe());
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Hoolichat')
        .setDescription('v API description')
        .setVersion('1.0')
        .addTag('Hoolichat')
        .addSecurity('Bearer', {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
    })
        .addSecurityRequirements('Bearer')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config, {
        include: [
            auth_module_1.AuthModule,
            profile_module_1.ProfileModule,
            chats_module_1.ChatsModule,
            users_module_1.UsersModule
        ],
    });
    swagger_1.SwaggerModule.setup('swagger/v1', app, document);
    app.enableCors();
    await app.listen(+process.env.PORT);
    console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
//# sourceMappingURL=main.js.map