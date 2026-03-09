import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOrigin =
    process.env.NODE_ENV === 'production'
      ? (process.env.WEB_URL ?? 'http://localhost:3000')
      : true;

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  await app.listen(process.env.API_PORT ?? 4000);
}
void bootstrap();
