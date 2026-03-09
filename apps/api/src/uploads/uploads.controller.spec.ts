import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

type PresignResponse = {
  success: boolean;
  uploadUrl: string;
  fileUrl: string;
};

type UploadResponse = {
  success: boolean;
  key: string;
  fileUrl: string;
};

describe('UploadsController (integration)', () => {
  let app: INestApplication;
  let uploadsService: UploadsService;
  let httpServer: Parameters<typeof request>[0];

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [UploadsService],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    uploadsService = moduleRef.get(UploadsService);
    await app.init();
    httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];
  });

  afterAll(async () => {
    await app.close();
    await rm(uploadsService.getUploadRoot(), { recursive: true, force: true });
  });

  it('creates upload token for allowed PTIT email', async () => {
    const response = await request(httpServer)
      .post('/uploads/presign')
      .send({
        email: 'abc@stu.ptit.edu.vn',
        fileName: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(201);

    const body = response.body as PresignResponse;

    expect(body.success).toBe(true);
    expect(body.uploadUrl).toContain('/uploads/');
    expect(body.fileUrl).toContain('/uploads/static/');
  });

  it('rejects non-PTIT domain during presign', async () => {
    await request(httpServer)
      .post('/uploads/presign')
      .send({
        email: 'abc@gmail.com',
        fileName: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(400);
  });

  it('uploads image via token and serves static file', async () => {
    const preSignResponse = await request(httpServer)
      .post('/uploads/presign')
      .send({
        email: 'test@ptit.edu.vn',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    const preSignBody = preSignResponse.body as PresignResponse;
    const token = preSignBody.uploadUrl.split('/').pop();

    if (!token) {
      throw new Error('Expected upload token from presign response.');
    }

    const uploadResponse = await request(httpServer)
      .post(`/uploads/${token}`)
      .attach('file', Buffer.from([1, 2, 3, 4]), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    const uploadBody = uploadResponse.body as UploadResponse;

    expect(uploadBody.success).toBe(true);
    expect(uploadBody.fileUrl).toContain('/uploads/static/');

    const key = uploadBody.fileUrl.split('/').pop();
    if (!key) {
      throw new Error('Expected uploaded file key from response.');
    }

    const staticResponse = await request(httpServer)
      .get(`/uploads/static/${key}`)
      .expect(200);

    const responseBody = staticResponse.body as Buffer;
    expect(responseBody).toBeInstanceOf(Buffer);
    expect(responseBody.length).toBeGreaterThan(0);
  });
});
