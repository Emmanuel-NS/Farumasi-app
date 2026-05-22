import { IsEmail, IsOptional, IsString, MinLength, IsEnum } from 'class-validator';

export enum RegisterRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  PHARMACIST = 'PHARMACIST',
  RIDER = 'RIDER',
}

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(RegisterRole)
  @IsOptional()
  role?: RegisterRole;
}

export class LoginDto {
  @IsString()
  emailOrPhone: string;

  @IsString()
  password: string;
}

export class SyncSupabaseDto {
  @IsString()
  supabaseToken: string;
}
