import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  async signAccessToken(payload: AccessTokenPayload, expiresInSeconds: number) {
    return this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'ptitdate-dev-access-secret',
      expiresIn: expiresInSeconds,
    });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: process.env.JWT_ACCESS_SECRET ?? 'ptitdate-dev-access-secret',
        },
      );
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }
}
