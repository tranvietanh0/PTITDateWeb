import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { normalizeEmail } from '../common/utils/email.util';

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeed(rawEmail: string, limit = 20) {
    const email = normalizeEmail(rawEmail);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
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

    const excludedIds = [
      user.id,
      ...user.swipesGiven.map((item) => item.targetId),
    ];

    const candidates = await this.prisma.user.findMany({
      where: {
        id: { notIn: excludedIds },
        profile: { isNot: null },
      },
      include: {
        profile: true,
        photos: { orderBy: { orderIndex: 'asc' } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      items: candidates.map((candidate) => ({
        userId: candidate.id,
        profile: candidate.profile,
        photos: candidate.photos,
      })),
    };
  }
}
