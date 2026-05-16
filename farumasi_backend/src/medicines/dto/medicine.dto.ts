import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUrl,
} from 'class-validator';

export class CreateMedicineDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  genericName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  category: string;

  @IsString()
  @IsOptional()
  subCategory?: string;

  @IsBoolean()
  @IsOptional()
  requiresPrescription?: boolean;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];
}

export class SearchMedicinesDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  requiresPrescription?: boolean;
}
