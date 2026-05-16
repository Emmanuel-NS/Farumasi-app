import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  RecommendPharmaciesDto,
  PharmacyScore,
} from './dto/recommendation.dto';

// Haversine distance (duplicated here to keep module self-contained)
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

/**
 * PHASE 1 SMART PHARMACY MATCHING
 *
 * Weighted scoring algorithm:
 *   availability_score  × 0.40  — does pharmacy stock all requested items?
 *   distance_score      × 0.30  — normalized 0–1 from max distance
 *   insurance_score     × 0.20  — does pharmacy accept patient's insurance?
 *   delivery_score      × 0.10  — placeholder (always 1.0 at MVP)
 *
 * Returns top 5 pharmacies ranked by total score.
 *
 * AI EVOLUTION NOTE:
 * This function is isolated intentionally so it can be replaced with
 * a Python FastAPI microservice call in Phase 2 without touching other modules.
 */
@Injectable()
export class RecommendationsService {
  // Weights — tune without code changes
  private readonly WEIGHTS = {
    availability: 0.4,
    distance: 0.3,
    insurance: 0.2,
    delivery: 0.1,
  };

  // Search radius cap (km)
  private readonly MAX_RADIUS_KM = 25;

  constructor(private readonly prisma: PrismaService) {}

  async recommend(dto: RecommendPharmaciesDto): Promise<PharmacyScore[]> {
    const { medicineIds, patientLat, patientLng, insuranceProvider } = dto;

    // 1. Load all verified, active pharmacies with inventory for requested meds
    const pharmacies = await this.prisma.pharmacy.findMany({
      where: { isActive: true, isVerified: true },
      include: {
        inventory: {
          where: {
            medicineId: { in: medicineIds },
            isPublished: true,
            quantity: { gt: 0 },
          },
          include: { medicine: true },
        },
      },
    });

    // 2. Pre-filter by radius
    const inRange = pharmacies
      .map((p) => ({
        ...p,
        distanceKm: haversineKm(patientLat, patientLng, p.latitude, p.longitude),
      }))
      .filter((p) => p.distanceKm <= this.MAX_RADIUS_KM);

    if (inRange.length === 0) return [];

    const maxDistance = Math.max(...inRange.map((p) => p.distanceKm));

    // 3. Score each pharmacy
    const scored: PharmacyScore[] = inRange.map((pharmacy) => {
      const stockedIds = new Set(pharmacy.inventory.map((i) => i.medicineId));
      const availableMedicines = pharmacy.inventory.map((i) => i.medicine.name);
      const missingMedicines = medicineIds.filter((id) => !stockedIds.has(id));

      // --- Availability score (0–1) ---
      const availabilityScore =
        medicineIds.length > 0
          ? stockedIds.size / medicineIds.length
          : 1.0;

      // --- Distance score (0–1, inverted — closer = higher) ---
      const distanceScore =
        maxDistance > 0
          ? 1 - pharmacy.distanceKm / maxDistance
          : 1.0;

      // --- Insurance score (0 or 1) ---
      const insuranceScore =
        insuranceProvider && pharmacy.insuranceAccepted.length > 0
          ? pharmacy.insuranceAccepted.includes(insuranceProvider as any)
            ? 1.0
            : 0.0
          : 0.5; // Unknown — neutral

      // --- Delivery score (placeholder — 1.0 for all at MVP) ---
      const deliveryScore = 1.0;

      const totalScore =
        availabilityScore * this.WEIGHTS.availability +
        distanceScore * this.WEIGHTS.distance +
        insuranceScore * this.WEIGHTS.insurance +
        deliveryScore * this.WEIGHTS.delivery;

      // Estimated price (sum of available inventory prices)
      const estimatedPrice = pharmacy.inventory.reduce(
        (sum, item) => sum + item.price,
        0,
      );

      return {
        pharmacyId: pharmacy.id,
        pharmacyName: pharmacy.name,
        address: pharmacy.address,
        latitude: pharmacy.latitude,
        longitude: pharmacy.longitude,
        distanceKm: Math.round(pharmacy.distanceKm * 10) / 10,
        totalScore: Math.round(totalScore * 100) / 100,
        availabilityScore: Math.round(availabilityScore * 100) / 100,
        distanceScore: Math.round(distanceScore * 100) / 100,
        insuranceScore,
        availableMedicines,
        missingMedicines,
        estimatedPrice,
      };
    });

    // 4. Sort by total score descending, return top 5
    return scored.sort((a, b) => b.totalScore - a.totalScore).slice(0, 5);
  }
}
