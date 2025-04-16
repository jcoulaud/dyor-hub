import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import 'dotenv/config';

const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const region = process.env.S3_REGION;
const bucket = process.env.S3_TOKEN_HISTORY_BUCKET;

if (!accessKeyId || !secretAccessKey || !region || !bucket) {
  throw new Error('Missing S3 configuration in environment variables');
}

const s3 = new S3Client({
  region,
  credentials: { accessKeyId, secretAccessKey },
});

/**
 * Uploads a JSON object to S3 and returns the public URL.
 * @param key S3 object key (e.g. 'token-history/abc123.json')
 * @param data Any serializable object
 */
export async function uploadJsonToS3(key: string, data: any): Promise<string> {
  const body = JSON.stringify(data);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'application/json',
    }),
  );
  // Standard S3 public URL format
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
