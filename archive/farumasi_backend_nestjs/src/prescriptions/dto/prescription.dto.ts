import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PrescriptionItemDto {
  @IsString()
  medicineName: string;

  @IsString()
  @IsOptional()
  medicineId?: string;

  @IsString()
  @IsOptional()
  quantity?: string;

  @IsString()
  @IsOptional()
  dosageInstructions?: string;

  @IsString()
  @IsOptional()
  ageRange?: string;

  @IsString()
  @IsOptional()
  doseMorning?: string;

  @IsString()
  @IsOptional()
  doseAfternoon?: string;

  @IsString()
  @IsOptional()
  doseEvening?: string;

  @IsString()
  @IsOptional()
  doseTimeInterval?: string;
}

export class CreatePrescriptionDto {
  @IsString()
  @IsOptional()
  imageUrl?: string;       // Supabase Storage URL after Flutter uploads

  @IsOptional()
  digitalData?: any;       // FlutterQuill delta JSON

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  @IsOptional()
  items?: PrescriptionItemDto[];

  @IsString()
  @IsOptional()
  doctorId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
