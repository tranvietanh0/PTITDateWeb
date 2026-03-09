import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SwipeAction } from '@prisma/client';
import { SwipesService } from './swipes.service';

describe('SwipesService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    swipe: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    match: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  };

  let service: SwipesService;

  beforeEach(() => {
    prisma.user.findUnique.mockReset();
    prisma.swipe.upsert.mockReset();
    prisma.swipe.findUnique.mockReset();
    prisma.match.upsert.mockReset();
    prisma.match.findMany.mockReset();

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.swipe.findUnique.mockResolvedValue(null);
    prisma.match.findMany.mockResolvedValue([]);

    service = new SwipesService(prisma as never);
  });

  it('rejects swipe to self', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'u1', email: 'a@ptit.edu.vn' })
      .mockResolvedValueOnce({ id: 'u1', profile: { id: 'p1' } });

    await expect(
      service.createSwipe({
        userId: 'u1',
        targetUserId: 'u1',
        action: SwipeAction.LIKE,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates non-match like when reverse like is missing', async () => {
    prisma.user.findUnique.mockImplementation(
      (args: { where: { id?: string } }) => {
        const { where } = args;
        if (where.id === 'u1') {
          return { id: 'u1', email: 'a@ptit.edu.vn' };
        }

        if (where.id === 'u2') {
          return { id: 'u2', profile: { id: 'p2' } };
        }

        return null;
      },
    );

    prisma.swipe.findUnique.mockResolvedValueOnce(null);

    const result = await service.createSwipe({
      userId: 'u1',
      targetUserId: 'u2',
      action: SwipeAction.LIKE,
    });

    expect(result.matched).toBe(false);
  });

  it('creates match when reverse like exists', async () => {
    prisma.user.findUnique.mockImplementation(
      (args: { where: { id?: string } }) => {
        const { where } = args;
        if (where.id === 'u1') {
          return { id: 'u1', email: 'a@ptit.edu.vn' };
        }

        if (where.id === 'u2') {
          return { id: 'u2', profile: { id: 'p2' } };
        }

        return null;
      },
    );

    prisma.swipe.findUnique.mockResolvedValueOnce({
      id: 's2',
      actorId: 'u2',
      targetId: 'u1',
      action: SwipeAction.LIKE,
    });
    prisma.match.upsert.mockResolvedValueOnce({ id: 'm1' });

    const result = await service.createSwipe({
      userId: 'u1',
      targetUserId: 'u2',
      action: SwipeAction.LIKE,
    });

    expect(result.matched).toBe(true);
    expect(result.matchId).toBe('m1');
  });

  it('throws on missing user for matches', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(service.getMatchesByUserId('user_unknown')).rejects.toThrow(
      NotFoundException,
    );
  });
});
