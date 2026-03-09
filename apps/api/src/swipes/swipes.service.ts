import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchStatus, SwipeAction } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { normalizeEmail } from '../common/utils/email.util';

@Injectable()
export class SwipesService {
  constructor(private readonly prisma: PrismaService) {}

  async createSwipe(input: {
    email: string;
    targetUserId: string;
    action: SwipeAction;
  }) {
    const actor = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(input.email) },
    });

    if (!actor) {
      throw new NotFoundException('Actor user not found.');
    }

    if (actor.id === input.targetUserId) {
      throw new BadRequestException('Cannot swipe your own profile.');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: input.targetUserId },
      include: { profile: true },
    });

    if (!target?.profile) {
      throw new NotFoundException('Target profile not found.');
    }

    await this.prisma.swipe.upsert({
      where: {
        actorId_targetId: {
          actorId: actor.id,
          targetId: target.id,
        },
      },
      update: { action: input.action },
      create: {
        actorId: actor.id,
        targetId: target.id,
        action: input.action,
      },
    });

    if (input.action !== SwipeAction.LIKE) {
      return { success: true, matched: false };
    }

    const reverseLike = await this.prisma.swipe.findUnique({
      where: {
        actorId_targetId: {
          actorId: target.id,
          targetId: actor.id,
        },
      },
    });

    if (!reverseLike || reverseLike.action !== SwipeAction.LIKE) {
      return { success: true, matched: false };
    }

    const [userAId, userBId] = [actor.id, target.id].sort();
    const match = await this.prisma.match.upsert({
      where: {
        userAId_userBId: {
          userAId,
          userBId,
        },
      },
      update: {
        status: MatchStatus.ACTIVE,
        matchedAt: new Date(),
      },
      create: {
        userAId,
        userBId,
        status: MatchStatus.ACTIVE,
      },
    });

    return { success: true, matched: true, matchId: match.id };
  }

  async getMatchesByEmail(rawEmail: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(rawEmail) },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const matches = await this.prisma.match.findMany({
      where: {
        status: MatchStatus.ACTIVE,
        OR: [{ userAId: user.id }, { userBId: user.id }],
      },
      orderBy: { matchedAt: 'desc' },
      include: {
        userA: {
          include: {
            profile: true,
            photos: { orderBy: { orderIndex: 'asc' } },
          },
        },
        userB: {
          include: {
            profile: true,
            photos: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
    });

    return {
      success: true,
      matches: matches.map((match) => {
        const partner = match.userAId === user.id ? match.userB : match.userA;
        return {
          matchId: match.id,
          matchedAt: match.matchedAt,
          partner: {
            userId: partner.id,
            email: partner.email,
            profile: partner.profile,
            photos: partner.photos,
          },
        };
      }),
    };
  }
}
