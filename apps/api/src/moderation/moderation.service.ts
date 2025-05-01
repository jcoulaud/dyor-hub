import {
  DetectModerationLabelsCommand,
  DetectModerationLabelsCommandOutput,
  RekognitionClient,
} from '@aws-sdk/client-rekognition';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum ModerationResult {
  SAFE = 'SAFE',
  UNSAFE = 'UNSAFE',
  ERROR = 'ERROR',
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);
  private readonly rekognitionClient: RekognitionClient;
  private readonly region: string;
  private readonly minConfidence: number = 75; // Confidence threshold (adjust as needed)

  constructor(private configService: ConfigService) {
    this.region = this.configService.getOrThrow<string>('S3_REGION'); // Use same region as S3

    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'S3_SECRET_ACCESS_KEY',
    );

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'Missing S3_ACCESS_KEY_ID or S3_SECRET_ACCESS_KEY in environment variables for Rekognition.',
      );
    }

    this.rekognitionClient = new RekognitionClient({
      region: this.region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
  }

  /**
   * Analyzes an image stored in S3 for unsafe content using Rekognition.
   */
  async analyzeImage(bucket: string, key: string): Promise<ModerationResult> {
    const command = new DetectModerationLabelsCommand({
      Image: {
        S3Object: {
          Bucket: bucket,
          Name: key,
        },
      },
      MinConfidence: this.minConfidence,
    });

    try {
      const output: DetectModerationLabelsCommandOutput =
        await this.rekognitionClient.send(command);

      if (output.ModerationLabels && output.ModerationLabels.length > 0) {
        this.logger.warn(
          `Unsafe content detected in s3://${bucket}/${key}: ` +
            `${output.ModerationLabels.map((l) => `${l.Name} (${l.Confidence?.toFixed(2)}%)`).join(', ')}`,
        );
        return ModerationResult.UNSAFE;
      } else {
        return ModerationResult.SAFE;
      }
    } catch (error) {
      this.logger.error(
        `Failed to analyze image s3://${bucket}/${key} with Rekognition: ${error.message}`,
        error.stack,
      );
      return ModerationResult.ERROR;
    }
  }
}
