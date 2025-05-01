import { PresignedUrlRequest, PresignedUrlResponse } from '@dyor-hub/types';
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { UploadsService } from './uploads.service';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image-presigned-url')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async getPresignedUrl(
    @Req() req: Request,
    @Body() body: PresignedUrlRequest,
  ): Promise<PresignedUrlResponse> {
    const userId = (req.user as any)?.id;
    if (!userId) {
      throw new BadRequestException(
        'User ID not found on authenticated request.',
      );
    }

    // 1. Validate file type against constant
    if (!ALLOWED_TYPES.includes(body.contentType)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`,
      );
    }

    // 2. Validate file size against constant
    if (body.contentLength > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File too large. Maximum size: ${MAX_FILE_SIZE_MB}MB`,
      );
    }

    // 3. Generate presigned URL using the validated info
    try {
      return await this.uploadsService.generatePresignedUrlForTempUpload(
        userId,
        body.filename,
        body.contentType,
        body.contentLength,
      );
    } catch (error) {
      console.error(
        `Error generating presigned URL for user ${userId}:`,
        error,
      );
      throw new BadRequestException('Could not generate upload URL.');
    }
  }
}
