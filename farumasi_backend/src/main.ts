import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS — restrict origins via env in production
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? [
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    credentials: true,
  });

  // Global validation pipe — strips unknown properties, validates DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 FARUMASI API running on http://localhost:${port}/api/v1`);
}
bootstrap();
