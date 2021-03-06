import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { ChatsModule } from './chats/chats.module';
import { UsersModule } from "./users/users.module";
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
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

  const document = SwaggerModule.createDocument(app, config, {
    include: [
      AuthModule,
      ProfileModule,
      ChatsModule,
      UsersModule
    ],
  });
  SwaggerModule.setup('swagger/v1', app, document);
  app.enableCors();
  await app.listen(+process.env.PORT);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
