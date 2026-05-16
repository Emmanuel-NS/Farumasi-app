import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MedicinesModule } from './medicines/medicines.module';
import { PharmaciesModule } from './pharmacies/pharmacies.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { OrdersModule } from './orders/orders.module';
import { RecommendationsModule } from './recommendations/recommendations.module';

@Module({
  imports: [
    // Load .env variables globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting — 100 requests per minute per IP
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    MedicinesModule,
    PharmaciesModule,
    PrescriptionsModule,
    OrdersModule,
    RecommendationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
