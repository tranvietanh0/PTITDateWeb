import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from '../../auth/token.service';

type RequestWithUser = {
  headers: Record<string, string | string[] | undefined>;
  userEmail?: string;
  userId?: string;
};

@Injectable()
export class JwtAccessGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const rawAuth = request.headers.authorization;
    const header = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer access token.');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing Bearer access token.');
    }

    const payload = await this.tokenService.verifyAccessToken(token);
    request.userEmail = payload.email;
    request.userId = payload.sub;

    return true;
  }
}
