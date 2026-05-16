import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { PharmaciesService } from './pharmacies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreatePharmacyDto, NearbyPharmaciesDto } from './dto/pharmacy.dto';

@Controller('pharmacies')
export class PharmaciesController {
  constructor(private readonly service: PharmaciesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('nearby')
  findNearby(@Query() query: NearbyPharmaciesDto) {
    return this.service.findNearby(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/inventory')
  @UseGuards(JwtAuthGuard)
  getInventory(@Param('id') id: string) {
    return this.service.getInventory(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  create(@Body() dto: CreatePharmacyDto) {
    return this.service.create(dto);
  }
}
