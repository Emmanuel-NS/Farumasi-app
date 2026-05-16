import { Body, Controller, Post, Get, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, SyncSupabaseDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Called by Flutter after Supabase Auth completes (phone OTP, social, etc.)
   * Exchanges Supabase token for a FARUMASI API JWT
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  sync(@Body() dto: SyncSupabaseDto) {
    return this.authService.syncSupabaseToken(dto.supabaseToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: any) {
    return this.authService.getMe(req.user.userId);
  }
}
