import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RequestMagicLinkDto } from './dto/request-magic-link.dto';
import { VerifyMagicLinkDto } from './dto/verify-magic-link.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { LogoutDto } from './dto/logout.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  async requestOtp(@Body() body: RequestOtpDto) {
    return this.authService.requestOtp(body.email);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body.email, body.code);
  }

  @Post('request-magic-link')
  async requestMagicLink(@Body() body: RequestMagicLinkDto) {
    return this.authService.requestMagicLink(
      body.email,
      process.env.WEB_URL ?? 'http://localhost:3000',
    );
  }

  @Post('verify-magic-link')
  async verifyMagicLink(@Body() body: VerifyMagicLinkDto) {
    return this.authService.verifyMagicLink(body.token);
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshSessionDto) {
    return this.authService.refreshSession(body.refreshToken);
  }

  @Post('logout')
  async logout(@Body() body: LogoutDto) {
    return this.authService.logout(body.refreshToken);
  }
}
