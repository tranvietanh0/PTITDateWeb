import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isPtitEmail, normalizeEmail } from '../common/utils/email.util';

type UploadTokenRecord = {
  key: string;
  expiresAt: number;
  expectedContentType?: string;
};

@Injectable()
export class UploadsService {
  private readonly tokenStore = new Map<string, UploadTokenRecord>();
  private readonly uploadRoot = join(process.cwd(), 'uploads');
  private readonly tokenExpiryMs = 5 * 60 * 1000;

  requestUpload(input: {
    email: string;
    fileName: string;
    contentType?: string;
  }) {
    const email = normalizeEmail(input.email);
    if (!isPtitEmail(email)) {
      throw new BadRequestException(
        'Only @ptit.edu.vn or @stu.ptit.edu.vn emails are allowed.',
      );
    }

    const sanitizedFileName = this.sanitizeFileName(input.fileName);
    const key = `${Date.now()}-${randomBytes(6).toString('hex')}-${sanitizedFileName}`;
    const token = randomBytes(24).toString('hex');

    this.tokenStore.set(token, {
      key,
      expiresAt: Date.now() + this.tokenExpiryMs,
      expectedContentType: input.contentType,
    });

    const apiUrl =
      process.env.API_URL ??
      `http://localhost:${process.env.API_PORT ?? '4000'}`;

    return {
      success: true,
      uploadUrl: `${apiUrl}/uploads/${token}`,
      fileUrl: `${apiUrl}/uploads/static/${key}`,
      expiresInSeconds: Math.floor(this.tokenExpiryMs / 1000),
    };
  }

  async consumeUploadToken(token: string, file: Express.Multer.File) {
    const record = this.tokenStore.get(token);
    if (!record) {
      throw new NotFoundException('Upload token not found or expired.');
    }

    this.tokenStore.delete(token);

    if (Date.now() > record.expiresAt) {
      throw new BadRequestException('Upload token expired.');
    }

    if (!file) {
      throw new BadRequestException('No file was uploaded.');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed.');
    }

    if (
      record.expectedContentType &&
      file.mimetype !== record.expectedContentType
    ) {
      throw new BadRequestException(
        'Uploaded file type does not match requested type.',
      );
    }

    await mkdir(this.uploadRoot, { recursive: true });
    await writeFile(join(this.uploadRoot, record.key), file.buffer);

    const apiUrl =
      process.env.API_URL ??
      `http://localhost:${process.env.API_PORT ?? '4000'}`;

    return {
      success: true,
      key: record.key,
      fileUrl: `${apiUrl}/uploads/static/${record.key}`,
    };
  }

  getUploadRoot() {
    return this.uploadRoot;
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  }
}
