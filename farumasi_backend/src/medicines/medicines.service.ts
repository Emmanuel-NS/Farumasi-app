import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicineDto } from './dto/medicine.dto';

@Injectable()
export class MedicinesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query?: { q?: string; category?: string }) {
    return this.prisma.medicine.findMany({
      where: {
        isActive: true,
        AND: [
          query?.q
            ? {
                OR: [
                  { name: { contains: query.q, mode: 'insensitive' } },
                  { genericName: { contains: query.q, mode: 'insensitive' } },
                  { keywords: { has: query.q.toLowerCase() } },
                ],
              }
            : {},
          query?.category
            ? { category: { equals: query.category, mode: 'insensitive' } }
            : {},
        ],
      },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.medicine.findUniqueOrThrow({ where: { id } });
  }

  create(dto: CreateMedicineDto) {
    return this.prisma.medicine.create({ data: dto });
  }

  getCategories() {
    return this.prisma.medicine.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { isActive: true },
      orderBy: { category: 'asc' },
    });
  }
}
