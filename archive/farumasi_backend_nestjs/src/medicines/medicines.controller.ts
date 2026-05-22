import { Controller, Get, Param, Query, Post, Body, UseGuards } from '@nestjs/common';
import { MedicinesService } from './medicines.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateMedicineDto } from './dto/medicine.dto';

@Controller('medicines')
export class MedicinesController {
  constructor(private readonly service: MedicinesService) {}

  @Get()
  findAll(@Query('q') q?: string, @Query('category') category?: string) {
    return this.service.findAll({ q, category });
  }

  @Get('categories')
  getCategories() {
    return this.service.getCategories();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.PHARMACY_ADMIN)
  create(@Body() dto: CreateMedicineDto) {
    return this.service.create(dto);
  }
}
