import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PresignedUrlResponse } from '@dyor-hub/types';
import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ModerationResult,
  ModerationService,
} from '../moderation/moderation.service';

const TEMP_PREFIX = 'images/temp-uploads/';
const CONFIRMED_PREFIX = 'images/confirmed-uploads/';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly presignedUrlExpiry = 300; // seconds (5 minutes)

  constructor(
    private readonly configService: ConfigService,
    private readonly moderationService: ModerationService,
  ) {
    this.region = this.configService.getOrThrow<string>('S3_REGION');
    this.bucketName = this.configService.getOrThrow<string>(
      'S3_TOKEN_HISTORY_BUCKET',
    );

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>(
          'S3_SECRET_ACCESS_KEY',
        ),
      },
    });

    this.logger.log(
      `S3 Upload Service Initialized. Bucket: ${this.bucketName}, Region: ${this.region}`,
    );
  }

  /**
   * Generates a presigned URL for uploading a file to a temporary location.
   */
  async generatePresignedUrlForTempUpload(
    userId: string,
    originalFilename: string,
    contentType: string,
    contentLength: number,
  ): Promise<PresignedUrlResponse> {
    try {
      const extension = path.extname(originalFilename).toLowerCase();
      const objectKey = `${TEMP_PREFIX}${userId}/${uuidv4()}${extension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
        ContentType: contentType,
        ContentLength: contentLength,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: this.presignedUrlExpiry,
      });

      return { presignedUrl, objectKey };
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned URL: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Could not generate upload URL');
    }
  }

  /**
   * Confirms an upload by moving it from the temporary prefix to the confirmed prefix.
   * Returns the URL of the confirmed object.
   */
  async confirmUpload(tempObjectKey: string): Promise<string> {
    if (!tempObjectKey.startsWith(TEMP_PREFIX)) {
      this.logger.warn(
        `Attempted to confirm object outside temp prefix: ${tempObjectKey}`,
      );
      return this.getObjectUrl(tempObjectKey);
    }

    const relativeKey = tempObjectKey.substring(TEMP_PREFIX.length);
    const confirmedObjectKey = `${CONFIRMED_PREFIX}${relativeKey}`;

    try {
      const copyCommand = new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${tempObjectKey}`,
        Key: confirmedObjectKey,
      });
      await this.s3Client.send(copyCommand);

      let moderationPassed = false;
      try {
        const moderationResult = await this.moderationService.analyzeImage(
          this.bucketName,
          confirmedObjectKey,
        );

        if (moderationResult === ModerationResult.UNSAFE) {
          const deleteUnsafeCommand = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: confirmedObjectKey,
          });
          await this.s3Client.send(deleteUnsafeCommand);

          throw new ForbiddenException('Inappropriate image content detected.');
        } else if (moderationResult === ModerationResult.ERROR) {
          moderationPassed = true;
        } else {
          moderationPassed = true;
        }
      } catch (moderationError) {
        if (moderationError instanceof ForbiddenException) {
          throw moderationError;
        }
        this.logger.error(
          `Moderation check failed unexpectedly for ${confirmedObjectKey}: ${moderationError.message}`,
          moderationError.stack,
        );
        moderationPassed = true;
      }

      if (moderationPassed) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: tempObjectKey,
        });
        await this.s3Client.send(deleteCommand);
      } else {
        this.logger.warn(
          `Moderation failed, temporary file ${tempObjectKey} may not have been deleted if error wasn't thrown.`,
        );
      }

      return this.getObjectUrl(confirmedObjectKey);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `Failed to confirm upload for key ${tempObjectKey}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to confirm file upload');
    }
  }

  /**
   * Generates the public URL for a given S3 object key.
   */
  getObjectUrl(objectKey: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${objectKey}`;
  }
}
