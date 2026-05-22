import { IsArray, IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class RecommendPharmaciesDto {
  @IsArray()
  @IsString({ each: true })
  medicineIds: string[];

  @IsNumber()
  @Type(() => Number)
  patientLat: number;

  @IsNumber()
  @Type(() => Number)
  patientLng: number;

  @IsString()
  @IsOptional()
  insuranceProvider?: string;
}

export interface PharmacyScore {
  pharmacyId: string;
  pharmacyName: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  totalScore: number;
  availabilityScore: number;
  distanceScore: number;
  insuranceScore: number;
  availableMedicines: string[];
  missingMedicines: string[];
  estimatedPrice: number;
}
