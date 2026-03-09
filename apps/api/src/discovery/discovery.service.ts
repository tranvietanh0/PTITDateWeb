import { Injectable, NotFoundException } from '@nestjs/common';
import { MatchStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type DiscoveryCursor = {
  id: string;
  createdAt: string;
};

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeed(input: { userId: string; limit: number; cursor?: string }) {
    const limit = Math.min(Math.max(input.limit, 1), 50);
    const parsedCursor = this.decodeCursor(input.cursor);

    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      include: {
        profile: true,
        preferences: true,
        swipesGiven: {
          select: {
            targetId: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const activeMatches = await this.prisma.match.findMany({
      where: {
        status: MatchStatus.ACTIVE,
        OR: [{ userAId: user.id }, { userBId: user.id }],
      },
      select: {
        userAId: true,
        userBId: true,
      },
    });

    const matchedUserIds = activeMatches.map((match) =>
      match.userAId === user.id ? match.userBId : match.userAId,
    );

    const excludedIds = [
      user.id,
      ...user.swipesGiven.map((item) => item.targetId),
      ...matchedUserIds,
    ];

    const preferredGender = user.preferences?.interestedIn ?? undefined;

    const where: Prisma.UserWhereInput = {
      id: { notIn: excludedIds },
      profile: {
        isNot: null,
      },
    };

    if (preferredGender) {
      where.profile = {
        is: {
          gender: preferredGender,
        },
      };
    }

    if (user.preferences?.minAge || user.preferences?.maxAge) {
      const bounds = this.ageBounds(
        user.preferences.minAge,
        user.preferences.maxAge,
      );

      where.profile = {
        is: {
          ...(preferredGender ? { gender: preferredGender } : {}),
          dob: {
            gte: bounds.minDob,
            lte: bounds.maxDob,
          },
        },
      };
    }

    const cursorFilter: Prisma.UserWhereInput | undefined = parsedCursor
      ? {
          OR: [
            {
              createdAt: {
                lt: new Date(parsedCursor.createdAt),
              },
            },
            {
              createdAt: new Date(parsedCursor.createdAt),
              id: {
                lt: parsedCursor.id,
              },
            },
          ],
        }
      : undefined;

    const candidates = await this.prisma.user.findMany({
      where: cursorFilter ? { AND: [where, cursorFilter] } : where,
      include: {
        profile: true,
        photos: { orderBy: { orderIndex: 'asc' } },
      },
      take: limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const nextCursor =
      candidates.length === limit
        ? this.encodeCursor({
            id: candidates[candidates.length - 1].id,
            createdAt:
              candidates[candidates.length - 1].createdAt.toISOString(),
          })
        : null;

    return {
      success: true,
      items: candidates.map((candidate) => ({
        userId: candidate.id,
        profile: candidate.profile,
        photos: candidate.photos,
      })),
      nextCursor,
    };
  }

  private ageBounds(minAge: number, maxAge: number) {
    const now = new Date();
    const maxDob = new Date(now);
    maxDob.setFullYear(now.getFullYear() - minAge);

    const minDob = new Date(now);
    minDob.setFullYear(now.getFullYear() - maxAge);

    return { minDob, maxDob };
  }

  private decodeCursor(cursor?: string): DiscoveryCursor | null {
    if (!cursor) {
      return null;
    }

    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf8');
      return JSON.parse(decoded) as DiscoveryCursor;
    } catch {
      return null;
    }
  }

  private encodeCursor(cursor: DiscoveryCursor): string {
    return Buffer.from(JSON.stringify(cursor)).toString('base64');
  }
}
