import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Gender } from '@prisma/client';
import { ProfilesService } from './profiles.service';

describe('ProfilesService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    profile: {
      upsert: jest.fn(),
    },
    preference: {
      upsert: jest.fn(),
    },
    photo: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  let service: ProfilesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProfilesService(prisma as never);
  });

  it('throws when user is missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.upsertProfile({
        email: 'test@ptit.edu.vn',
        displayName: 'Test',
        dob: '2003-01-01',
        gender: Gender.MALE,
        bio: 'bio',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects invalid age range in preferences', async () => {
    await expect(
      service.upsertPreferences({
        email: 'test@ptit.edu.vn',
        minAge: 30,
        maxAge: 20,
        distanceKm: 15,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns completion payload from profile query', async () => {
    prisma.user.findUnique.mockResolvedValue({
      email: 'test@ptit.edu.vn',
      profile: {
        displayName: 'Test User',
        dob: new Date('2003-01-01'),
        bio: 'Hello',
        gender: Gender.FEMALE,
      },
      preferences: {
        minAge: 18,
        maxAge: 25,
        distanceKm: 20,
      },
      photos: [{ id: 'p1' }, { id: 'p2' }],
    });

    const result = await service.getProfileByEmail('test@ptit.edu.vn');

    expect(result.completion.isComplete).toBe(true);
    expect(result.completion.photoCount).toBe(2);
  });
});
