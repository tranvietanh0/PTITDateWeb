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
import { TokenService } from './token.service';

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

type SessionContext = {
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tokenService: TokenService,
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

  async verifyOtp(rawEmail: string, code: string, context?: SessionContext) {
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
    return this.issueSessionForEmail(email, AuthMethod.OTP, context);
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

  async verifyMagicLink(token: string, context?: SessionContext) {
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
    return this.issueSessionForEmail(
      record.email,
      AuthMethod.MAGIC_LINK,
      context,
    );
  }

  async refreshSession(refreshToken: string, context?: SessionContext) {
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

    this.assertSessionContext(
      {
        id: session.id,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        fingerprintHash: session.fingerprintHash,
      },
      context,
    );

    const nextRefreshToken = this.generateToken(48);
    const nextRefreshTokenHash = this.hashToken(nextRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: nextRefreshTokenHash,
        expiresAt,
        userAgent: context?.userAgent ?? session.userAgent,
        ipAddress: context?.ipAddress ?? session.ipAddress,
        fingerprintHash:
          this.computeSessionFingerprintHash(context) ??
          session.fingerprintHash,
      },
    });

    const accessToken = await this.tokenService.signAccessToken(
      {
        sub: session.user.id,
        email: session.user.email,
      },
      ACCESS_TOKEN_EXPIRY_SECONDS,
    );

    return {
      success: true,
      email: session.user.email,
      accessToken,
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

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        verifiedAt: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Session user not found.');
    }

    return {
      success: true,
      user,
    };
  }

  private assertPtitEmail(email: string) {
    if (!isPtitEmail(email)) {
      throw new BadRequestException(
        'Only @ptit.edu.vn or @stu.ptit.edu.vn emails are allowed.',
      );
    }
  }

  private async issueSessionForEmail(
    email: string,
    method: AuthMethod,
    context?: SessionContext,
  ) {
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
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
        fingerprintHash: this.computeSessionFingerprintHash(context),
      },
    });

    const accessToken = await this.tokenService.signAccessToken(
      {
        sub: user.id,
        email: user.email,
      },
      ACCESS_TOKEN_EXPIRY_SECONDS,
    );

    return {
      success: true,
      email,
      accessToken,
      refreshToken,
      expiresInSeconds: ACCESS_TOKEN_EXPIRY_SECONDS,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private computeSessionFingerprintHash(
    context?: SessionContext,
  ): string | null {
    if (!context) {
      return null;
    }

    const source = [
      context.deviceId?.trim().toLowerCase() ?? '',
      context.userAgent?.trim().toLowerCase() ?? '',
      this.normalizeIpAddress(context.ipAddress),
    ].join('|');

    if (!source.replace(/\|/g, '')) {
      return null;
    }

    return this.hashToken(source);
  }

  private normalizeIpAddress(ipAddress?: string): string {
    if (!ipAddress) {
      return '';
    }

    const normalized = ipAddress.replace('::ffff:', '').trim();
    if (normalized.includes(':')) {
      return normalized.split(':').slice(0, 4).join(':');
    }

    const parts = normalized.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }

    return normalized;
  }

  private assertSessionContext(
    session: {
      id: string;
      userAgent: string | null;
      ipAddress: string | null;
      fingerprintHash: string | null;
    },
    context?: SessionContext,
  ) {
    const expectedFingerprint = this.computeSessionFingerprintHash(context);

    if (session.fingerprintHash) {
      if (
        !expectedFingerprint ||
        expectedFingerprint !== session.fingerprintHash
      ) {
        this.revokeSessionAsync(session.id);

        throw new UnauthorizedException(
          'Session context mismatch. Please login again.',
        );
      }

      return;
    }

    if (
      session.userAgent &&
      context?.userAgent &&
      session.userAgent !== context.userAgent
    ) {
      this.revokeSessionAsync(session.id);
      throw new UnauthorizedException(
        'Session context mismatch. Please login again.',
      );
    }

    if (
      session.ipAddress &&
      context?.ipAddress &&
      session.ipAddress !== context.ipAddress
    ) {
      this.revokeSessionAsync(session.id);
      throw new UnauthorizedException(
        'Session context mismatch. Please login again.',
      );
    }
  }

  private revokeSessionAsync(sessionId: string) {
    void this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
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
