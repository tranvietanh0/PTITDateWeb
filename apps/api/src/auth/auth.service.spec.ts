import { UnauthorizedException } from '@nestjs/common';
import { AuthMethod } from '@prisma/client';
import { AuthService } from './auth.service';

type RedisMock = {
  get: jest.Mock;
  setWithTtl: jest.Mock;
  del: jest.Mock;
};

type PrismaMock = {
  user: { upsert: jest.Mock };
  authIdentity: { upsert: jest.Mock };
  session: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock };
};

describe('AuthService', () => {
  let service: AuthService;
  let redis: RedisMock;
  let prisma: PrismaMock;
  let tokenService: { signAccessToken: jest.Mock };

  beforeEach(() => {
    redis = {
      get: jest.fn().mockResolvedValue(null),
      setWithTtl: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    prisma = {
      user: {
        upsert: jest.fn().mockResolvedValue({
          id: 'user_1',
          email: 'test@ptit.edu.vn',
        }),
      },
      authIdentity: {
        upsert: jest.fn().mockResolvedValue({
          id: 'identity_1',
          userId: 'user_1',
          method: AuthMethod.OTP,
        }),
      },
      session: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue(undefined),
        create: jest.fn().mockResolvedValue({ id: 'session_1' }),
      },
    };

    tokenService = {
      signAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
    };

    service = new AuthService(
      prisma as never,
      redis as never,
      tokenService as never,
    );
  });

  it('rejects non-PTIT email when requesting OTP', async () => {
    await expect(service.requestOtp('abc@gmail.com')).rejects.toThrow(
      'Only @ptit.edu.vn or @stu.ptit.edu.vn emails are allowed.',
    );
  });

  it('accepts PTIT student domain when requesting OTP', async () => {
    const result = await service.requestOtp('abc@stu.ptit.edu.vn');

    expect(result.success).toBe(true);
    expect(result.email).toBe('abc@stu.ptit.edu.vn');
  });

  it('creates OTP record for PTIT email', async () => {
    const result = await service.requestOtp('Student@ptit.edu.vn');

    expect(result.success).toBe(true);
    expect(result.email).toBe('student@ptit.edu.vn');
    expect(result.developmentOtp).toMatch(/^\d{6}$/);
    expect(redis.setWithTtl).toHaveBeenCalledTimes(1);
  });

  it('verifies OTP and issues session', async () => {
    const otp = '123456';

    redis.get.mockResolvedValueOnce(
      JSON.stringify({
        code: otp,
        attempts: 0,
        requestedAt: Date.now(),
        expiresAt: Date.now() + 60_000,
      }),
    );

    const result = await service.verifyOtp('test@ptit.edu.vn', otp);

    expect(result.success).toBe(true);
    expect(result.email).toBe('test@ptit.edu.vn');
    expect(result.refreshToken.length).toBeGreaterThan(30);
    expect(prisma.user.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.authIdentity.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.session.create).toHaveBeenCalledTimes(1);
  });

  it('rejects refresh when session not found', async () => {
    await expect(service.refreshSession('invalid-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('returns success for logout with unknown token', async () => {
    await expect(service.logout('unknown-token')).resolves.toEqual({
      success: true,
    });
  });
});
