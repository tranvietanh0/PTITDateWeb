import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthMethod } from '@prisma/client';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import {
  ACCESS_TOKEN_EXPIRY_SECONDS,
  MAGIC_LINK_EXPIRY_MS,
  MAX_OTP_ATTEMPTS,
  OTP_EXPIRY_MS,
  OTP_RESEND_COOLDOWN_MS,
  REFRESH_TOKEN_EXPIRY_MS,
} from '../common/constants/auth.constants';
import { isPtitEmail, normalizeEmail } from '../common/utils/email.util';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

type OtpRecord = {
  code: string;
  expiresAt: number;
  attempts: number;
  requestedAt: number;
};

type MagicLinkRecord = {
  email: string;
  expiresAt: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async requestOtp(rawEmail: string) {
    const email = normalizeEmail(rawEmail);
    this.assertPtitEmail(email);

    const currentRaw = await this.redis.get(this.otpKey(email));
    const current = currentRaw ? (JSON.parse(currentRaw) as OtpRecord) : null;
    const now = Date.now();

    if (current && now - current.requestedAt < OTP_RESEND_COOLDOWN_MS) {
      throw new HttpException(
        'Please wait before requesting a new OTP.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = randomInt(100000, 1000000).toString();

    const record: OtpRecord = {
      code,
      attempts: 0,
      requestedAt: now,
      expiresAt: now + OTP_EXPIRY_MS,
    };

    await this.redis.setWithTtl(
      this.otpKey(email),
      JSON.stringify(record),
      Math.floor(OTP_EXPIRY_MS / 1000),
    );

    return {
      success: true,
      email,
      expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
      developmentOtp: process.env.NODE_ENV === 'production' ? undefined : code,
    };
  }

  async verifyOtp(rawEmail: string, code: string) {
    const email = normalizeEmail(rawEmail);
    this.assertPtitEmail(email);

    const rawRecord = await this.redis.get(this.otpKey(email));
    const record = rawRecord ? (JSON.parse(rawRecord) as OtpRecord) : null;

    if (!record) {
      throw new UnauthorizedException('OTP not found or expired.');
    }

    if (Date.now() > record.expiresAt) {
      await this.redis.del(this.otpKey(email));
      throw new UnauthorizedException('OTP expired.');
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await this.redis.del(this.otpKey(email));
      throw new HttpException(
        'Too many failed OTP attempts.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (record.code !== code) {
      const nextRecord = { ...record, attempts: record.attempts + 1 };
      const ttlSeconds = Math.max(
        1,
        Math.floor((record.expiresAt - Date.now()) / 1000),
      );

      await this.redis.setWithTtl(
        this.otpKey(email),
        JSON.stringify(nextRecord),
        ttlSeconds,
      );

      throw new UnauthorizedException('Invalid OTP code.');
    }

    await this.redis.del(this.otpKey(email));
    return this.issueSessionForEmail(email, AuthMethod.OTP);
  }

  async requestMagicLink(rawEmail: string, webUrl: string) {
    const email = normalizeEmail(rawEmail);
    this.assertPtitEmail(email);

    const token = this.generateToken();
    const record: MagicLinkRecord = {
      email,
      expiresAt: Date.now() + MAGIC_LINK_EXPIRY_MS,
    };

    await this.redis.setWithTtl(
      this.magicLinkKey(token),
      JSON.stringify(record),
      Math.floor(MAGIC_LINK_EXPIRY_MS / 1000),
    );

    const url = new URL('/auth/callback', webUrl);
    url.searchParams.set('token', token);

    return {
      success: true,
      email,
      expiresInSeconds: Math.floor(MAGIC_LINK_EXPIRY_MS / 1000),
      developmentMagicLink:
        process.env.NODE_ENV === 'production' ? undefined : url.toString(),
    };
  }

  async verifyMagicLink(token: string) {
    const rawRecord = await this.redis.get(this.magicLinkKey(token));
    const record = rawRecord
      ? (JSON.parse(rawRecord) as MagicLinkRecord)
      : null;

    if (!record) {
      throw new UnauthorizedException('Magic link is invalid or already used.');
    }

    if (Date.now() > record.expiresAt) {
      await this.redis.del(this.magicLinkKey(token));
      throw new UnauthorizedException('Magic link expired.');
    }

    await this.redis.del(this.magicLinkKey(token));
    return this.issueSessionForEmail(record.email, AuthMethod.MAGIC_LINK);
  }

  async refreshSession(refreshToken: string) {
    const refreshTokenHash = this.hashToken(refreshToken);

    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash },
      include: { user: true },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Refresh token invalid or expired.');
    }

    const nextRefreshToken = this.generateToken(48);
    const nextRefreshTokenHash = this.hashToken(nextRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: nextRefreshTokenHash,
        expiresAt,
      },
    });

    return {
      success: true,
      email: session.user.email,
      accessToken: this.generateToken(32),
      refreshToken: nextRefreshToken,
      expiresInSeconds: ACCESS_TOKEN_EXPIRY_SECONDS,
    };
  }

  async logout(refreshToken: string) {
    const refreshTokenHash = this.hashToken(refreshToken);

    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash },
    });

    if (!session) {
      return { success: true };
    }

    if (!session.revokedAt) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
    }

    return { success: true };
  }

  private assertPtitEmail(email: string) {
    if (!isPtitEmail(email)) {
      throw new BadRequestException('Only @ptit.edu.vn emails are allowed.');
    }
  }

  private async issueSessionForEmail(email: string, method: AuthMethod) {
    const now = new Date();

    const user = await this.prisma.user.upsert({
      where: { email },
      update: { verifiedAt: now },
      create: {
        email,
        verifiedAt: now,
      },
    });

    await this.prisma.authIdentity.upsert({
      where: {
        userId_method: {
          userId: user.id,
          method,
        },
      },
      update: { lastLoginAt: now },
      create: {
        userId: user.id,
        method,
        lastLoginAt: now,
      },
    });

    const refreshToken = this.generateToken(48);
    const refreshTokenHash = this.hashToken(refreshToken);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    return {
      success: true,
      email,
      accessToken: this.generateToken(32),
      refreshToken,
      expiresInSeconds: ACCESS_TOKEN_EXPIRY_SECONDS,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private otpKey(email: string): string {
    return `auth:otp:${email}`;
  }

  private magicLinkKey(token: string): string {
    return `auth:magic-link:${token}`;
  }

  private generateToken(size = 32): string {
    return randomBytes(size).toString('hex');
  }
}
