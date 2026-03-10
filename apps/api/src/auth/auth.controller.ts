import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
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
  async verifyOtp(@Body() body: VerifyOtpDto, @Req() request: Request) {
    return this.authService.verifyOtp(
      body.email,
      body.code,
      this.getSessionContext(request),
    );
  }

  @Post('request-magic-link')
  async requestMagicLink(@Body() body: RequestMagicLinkDto) {
    return this.authService.requestMagicLink(
      body.email,
      process.env.WEB_URL ?? 'http://localhost:3000',
    );
  }

  @Post('verify-magic-link')
  async verifyMagicLink(
    @Body() body: VerifyMagicLinkDto,
    @Req() request: Request,
  ) {
    return this.authService.verifyMagicLink(
      body.token,
      this.getSessionContext(request),
    );
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshSessionDto, @Req() request: Request) {
    return this.authService.refreshSession(
      body.refreshToken,
      this.getSessionContext(request),
    );
  }

  @Post('logout')
  async logout(@Body() body: LogoutDto) {
    return this.authService.logout(body.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAccessGuard)
  async me(@CurrentUserId() userId: string) {
    return this.authService.getCurrentUser(userId);
  }

  private getSessionContext(request: Request) {
    return {
      userAgent: request.get('user-agent') ?? undefined,
      ipAddress: request.ip ?? undefined,
      deviceId: request.get('x-device-id') ?? undefined,
    };
  }
}
