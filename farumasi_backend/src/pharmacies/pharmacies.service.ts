import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePharmacyDto, NearbyPharmaciesDto } from './dto/pharmacy.dto';

// Haversine formula — distance between two GPS coordinates in km
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class PharmaciesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.pharmacy.findMany({
      where: { isActive: true, isVerified: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id },
      include: {
        inventory: {
          where: { isPublished: true, quantity: { gt: 0 } },
          include: { medicine: true },
          orderBy: { medicine: { name: 'asc' } },
        },
      },
    });
    if (!pharmacy) throw new NotFoundException('Pharmacy not found');
    return pharmacy;
  }

  async findNearby(dto: NearbyPharmaciesDto) {
    const radiusKm = dto.radiusKm ?? 10;

    // Bounding box pre-filter (faster than scanning all rows)
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((dto.lat * Math.PI) / 180));

    const pharmacies = await this.prisma.pharmacy.findMany({
      where: {
        isActive: true,
        isVerified: true,
        latitude: { gte: dto.lat - latDelta, lte: dto.lat + latDelta },
        longitude: { gte: dto.lng - lngDelta, lte: dto.lng + lngDelta },
      },
    });

    // Precise haversine filter + attach distance
    return pharmacies
      .map((p) => ({
        ...p,
        distanceKm: Math.round(haversineKm(dto.lat, dto.lng, p.latitude, p.longitude) * 10) / 10,
      }))
      .filter((p) => p.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  async getInventory(pharmacyId: string) {
    return this.prisma.inventoryItem.findMany({
      where: { pharmacyId, isPublished: true },
      include: { medicine: true },
      orderBy: { medicine: { name: 'asc' } },
    });
  }

  async create(dto: CreatePharmacyDto) {
    return this.prisma.pharmacy.create({ data: dto });
  }
}
