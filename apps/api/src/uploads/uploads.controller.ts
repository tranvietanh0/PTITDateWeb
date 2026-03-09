import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { basename, join } from 'node:path';
import { RequestUploadDto } from './dto/request-upload.dto';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('presign')
  requestUpload(@Body() body: RequestUploadDto) {
    return this.uploadsService.requestUpload(body);
  }

  @Post(':token')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 6 * 1024 * 1024,
      },
    }),
  )
  async uploadFile(
    @Param('token') token: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadsService.consumeUploadToken(token, file);
  }

  @Get('static/:key')
  readStatic(@Param('key') key: string, @Res() res: Response) {
    const safeName = basename(key);
    const fullPath = join(this.uploadsService.getUploadRoot(), safeName);
    return res.sendFile(fullPath);
  }
}
