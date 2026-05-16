import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import { Role, User } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly supabase = createClient(
    process.env.SUPABASE_URL ?? 'http://placeholder',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder',
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone) throw new BadRequestException('Email or phone is required');
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.email ? { email: dto.email } : { id: 'never' },
          dto.phone ? { phone: dto.phone } : { id: 'never' },
        ],
      },
    });
    if (existing) throw new ConflictException('User already exists');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const role: Role = (dto.role as unknown as Role) ?? Role.PATIENT;
    const user = await this.prisma.user.create({
      data: { email: dto.email, phone: dto.phone, name: dto.name, passwordHash, role },
    });
    await this._createRoleProfile(user.id, role);
    return { ...this._issueTokens(user.id, user.role), user: this._safeUser(user) };
  }

  async login(dto: LoginDto) {
    const isEmail = dto.emailOrPhone.includes('@');
    const user = await this.prisma.user.findFirst({
      where: isEmail ? { email: dto.emailOrPhone } : { phone: dto.emailOrPhone },
    });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');
    return { ...this._issueTokens(user.id, user.role), user: this._safeUser(user) };
  }

  async syncSupabaseToken(supabaseToken: string) {
    const { data, error } = await this.supabase.auth.getUser(supabaseToken);
    if (error || !data.user) throw new UnauthorizedException('Invalid Supabase token');
    const supabaseUser = data.user;
    let user = await this.prisma.user.findUnique({ where: { supabaseId: supabaseUser.id } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          supabaseId: supabaseUser.id,
          email: supabaseUser.email,
          phone: supabaseUser.phone,
          name: supabaseUser.user_metadata?.name ?? 'User',
          role: Role.PATIENT,
        },
      });
      await this._createRoleProfile(user.id, user.role);
    }
    return { ...this._issueTokens(user.id, user.role), user: this._safeUser(user) };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { patient: true, pharmacist: { include: { pharmacy: true } }, rider: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    const { passwordHash, ...safeUser } = user;
    return { user: safeUser };
  }

  private _safeUser(user: User) {
    return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatarUrl: user.avatarUrl };
  }

  private _issueTokens(userId: string, role: Role) {
    const payload = { sub: userId, role };
    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  private async _createRoleProfile(userId: string, role: Role) {
    switch (role) {
      case Role.PATIENT:
        await this.prisma.patient.upsert({ where: { userId }, create: { userId }, update: {} });
        break;
      case Role.RIDER:
        await this.prisma.rider.upsert({ where: { userId }, create: { userId }, update: {} });
        break;
      default:
        break;
    }
  }
}
