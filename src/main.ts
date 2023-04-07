import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { AuthModule } from "./auth/auth.module";
import { ProfileModule } from "./profile/profile.module";
import { ChatsModule } from "./chats/chats.module";
import { UsersModule } from "./users/users.module";
import { NestExpressApplication } from "@nestjs/platform-express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ContactsModule } from "./contacts/contacts.module";
import { FilesModule } from "./files/files.module";
import { MessagesModule } from "./messages/messages.module";
import { urlencoded, json } from "express";
import * as admin from "firebase-admin";
import { ServiceAccount } from "firebase-admin";
import { HttpModule } from "./http/http.module";

const serviceAccount = require("../fb.json");

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService: ConfigService = app.get(ConfigService);

  // Initialize the firebase admin app
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    //databaseURL: "https://xxxxx.firebaseio.com",
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: ["1", "2"],
    prefix: "api/v",
  });

  app.useGlobalPipes(new ValidationPipe());
  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ extended: true, limit: "50mb" }));
  const config = new DocumentBuilder()
    .setTitle("Hoolichat")
    .setDescription("v API description")
    .setVersion("1.0")
    .addTag("Hoolichat")
    .addSecurity("Bearer", {
      type: "apiKey",
      in: "header",
      name: "Authorization",
    })
    .addSecurityRequirements("Bearer")
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [
      AuthModule,
      ProfileModule,
      ChatsModule,
      MessagesModule,
      UsersModule,
      ContactsModule,
      FilesModule,
      HttpModule,
    ],
  });
  SwaggerModule.setup("swagger/v1", app, document);
  app.enableCors();
  await app.listen(+process.env.PORT);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
