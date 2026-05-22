import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/prescription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, PrescriptionStatus } from '@prisma/client';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard)
export class PrescriptionsController {
  constructor(private readonly service: PrescriptionsService) {}

  // Patient submits a prescription (image URL or digital)
  @Post()
  create(@Request() req: any, @Body() dto: CreatePrescriptionDto) {
    return this.service.create(req.user.userId, dto);
  }

  // Patient views their prescriptions
  @Get('my')
  findMine(@Request() req: any) {
    return this.service.findForPatient(req.user.userId);
  }

  // Pharmacist views pending queue
  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(Role.PHARMACIST, Role.PHARMACY_ADMIN, Role.SUPER_ADMIN)
  findPending() {
    return this.service.findPending();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // Pharmacist reviews a prescription (approve / reject / etc.)
  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(Role.PHARMACIST, Role.PHARMACY_ADMIN)
  review(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { status: PrescriptionStatus; notes?: string },
  ) {
    return this.service.review(id, req.user.userId, body.status, body.notes);
  }
}
