import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RecommendPharmaciesDto } from './dto/recommendation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Post('pharmacies')
  recommend(@Body() dto: RecommendPharmaciesDto) {
    return this.service.recommend(dto);
  }
}
