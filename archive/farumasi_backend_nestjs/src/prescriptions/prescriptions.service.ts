import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrescriptionDto } from './dto/prescription.dto';
import { PrescriptionStatus } from '@prisma/client';

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePrescriptionDto) {
    const patient = await this.prisma.patient.findFirst({ where: { userId } });
    if (!patient) throw new NotFoundException('Patient profile not found');

    return this.prisma.prescription.create({
      data: {
        patientId: patient.id,
        doctorId: dto.doctorId,
        imageUrl: dto.imageUrl,
        digitalData: dto.digitalData,
        notes: dto.notes,
        status: PrescriptionStatus.PENDING,
        items: dto.items
          ? {
              create: dto.items.map((item) => ({
                medicineName: item.medicineName,
                medicineId: item.medicineId,
                dosageInstructions: item.dosageInstructions,
                ageRange: item.ageRange,
                doseMorning: item.doseMorning,
                doseAfternoon: item.doseAfternoon,
                doseEvening: item.doseEvening,
                doseTimeInterval: item.doseTimeInterval,
              })),
            }
          : undefined,
      },
      include: { items: true },
    });
  }

  async findForPatient(userId: string) {
    const patient = await this.prisma.patient.findFirst({ where: { userId } });
    if (!patient) return [];

    return this.prisma.prescription.findMany({
      where: { patientId: patient.id },
      include: { items: true, doctor: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPending() {
    return this.prisma.prescription.findMany({
      where: { status: PrescriptionStatus.PENDING },
      include: {
        items: true,
        patient: { include: { user: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const rx = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        items: { include: { medicine: true } },
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        reviewedBy: { include: { user: true } },
      },
    });
    if (!rx) throw new NotFoundException('Prescription not found');
    return rx;
  }

  async review(
    prescriptionId: string,
    pharmacistUserId: string,
    status: PrescriptionStatus,
    notes?: string,
  ) {
    const pharmacist = await this.prisma.pharmacist.findFirst({
      where: { userId: pharmacistUserId },
    });
    if (!pharmacist) throw new NotFoundException('Pharmacist profile not found');

    return this.prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        status,
        reviewedById: pharmacist.id,
        reviewedAt: new Date(),
        notes,
      },
    });
  }
}
