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
import { v4 as uuidv4 } from 'uuid';
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

  @Post('signup/image-presigned-url')
  @HttpCode(HttpStatus.OK)
  async getSignupPresignedUrl(
    @Body() body: PresignedUrlRequest,
  ): Promise<PresignedUrlResponse> {
    // 1. Validate file type
    if (!ALLOWED_TYPES.includes(body.contentType)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`,
      );
    }

    // 2. Validate file size
    if (body.contentLength > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File too large. Maximum size: ${MAX_FILE_SIZE_MB}MB`,
      );
    }

    // 3. Generate presigned URL using a temporary signup identifier
    try {
      const tempSignupId = `signup-${uuidv4()}`;
      return await this.uploadsService.generatePresignedUrlForTempUpload(
        tempSignupId,
        body.filename,
        body.contentType,
        body.contentLength,
      );
    } catch (error) {
      console.error(`Error generating presigned URL for signup:`, error);
      throw new BadRequestException('Could not generate upload URL.');
    }
  }

  @Post('confirm-upload')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async confirmUpload(
    @Body() body: { tempObjectKey: string },
  ): Promise<{ finalUrl: string }> {
    try {
      const finalUrl = await this.uploadsService.confirmUpload(
        body.tempObjectKey,
      );
      return { finalUrl };
    } catch (error) {
      console.error(`Error confirming upload:`, error);

      if (
        error.name === 'ForbiddenException' ||
        error.constructor.name === 'ForbiddenException'
      ) {
        throw error;
      }

      throw new BadRequestException('Could not confirm upload.');
    }
  }
}
