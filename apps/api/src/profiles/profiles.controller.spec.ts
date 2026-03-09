import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../database/prisma.service';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

type ProfileCompletionResponse = {
  completion: {
    isComplete: boolean;
    photoCount: number;
  };
};

describe('ProfilesController (integration)', () => {
  let app: INestApplication;
  let httpServer: Parameters<typeof request>[0];

  const prismaMock = {
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

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [
        ProfilesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for invalid email query', async () => {
    await request(httpServer)
      .get('/profiles')
      .query({ email: 'abc' })
      .expect(400);
  });

  it('returns profile completion payload', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      email: 'test@ptit.edu.vn',
      profile: {
        displayName: 'Test User',
        dob: new Date('2003-01-01'),
        bio: 'Bio',
        gender: 'FEMALE',
      },
      preferences: {
        minAge: 18,
        maxAge: 25,
        distanceKm: 30,
      },
      photos: [
        { id: 'photo_1', url: 'http://localhost/p1.jpg', orderIndex: 0 },
        { id: 'photo_2', url: 'http://localhost/p2.jpg', orderIndex: 1 },
      ],
    });

    const response = await request(httpServer)
      .get('/profiles')
      .query({ email: 'test@ptit.edu.vn' })
      .expect(200);

    const body = response.body as ProfileCompletionResponse;

    expect(body.completion.isComplete).toBe(true);
    expect(body.completion.photoCount).toBe(2);
  });

  it('returns 400 when minAge is greater than maxAge', async () => {
    await request(httpServer)
      .put('/profiles/preferences')
      .send({
        email: 'test@ptit.edu.vn',
        minAge: 30,
        maxAge: 20,
        distanceKm: 15,
      })
      .expect(400);
  });
});
