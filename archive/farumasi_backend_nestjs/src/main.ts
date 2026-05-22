import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS — allow all localhost origins in dev, restrict via env in production
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',');
  app.enableCors({
    origin: allowedOrigins ?? ((origin, cb) => {
      // Allow requests with no origin (mobile, curl) or any localhost port
      if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        cb(null, true);
      } else {
        cb(new Error('CORS: origin not allowed'));
      }
    }),
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
