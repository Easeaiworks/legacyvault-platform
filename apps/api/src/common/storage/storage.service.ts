import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

/**
 * Thin wrapper around S3 (or Minio in local dev).
 *
 * We never stream uploads through the API — clients upload directly to S3
 * using presigned PUT URLs. The API only issues and verifies those URLs,
 * and tracks metadata in the documents table.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('S3_BUCKET');
    this.client = new S3Client({
      region: this.config.get<string>('S3_REGION', 'us-east-1'),
      endpoint: this.config.get<string>('S3_ENDPOINT') || undefined,
      forcePathStyle: this.config.get<boolean>('S3_FORCE_PATH_STYLE', false),
      credentials:
        this.config.get<string>('S3_ACCESS_KEY') && this.config.get<string>('S3_SECRET_KEY')
          ? {
              accessKeyId: this.config.getOrThrow<string>('S3_ACCESS_KEY'),
              secretAccessKey: this.config.getOrThrow<string>('S3_SECRET_KEY'),
            }
          : undefined, // Fall back to IAM role / instance profile in prod.
    });
  }

  /** Build an opaque, non-guessable S3 key under a tenant prefix. */
  buildKey(tenantId: string, filename: string): string {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    return `tenants/${tenantId}/${randomUUID()}-${safe}`;
  }

  async presignUpload(params: {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<{ url: string; expiresAt: Date }> {
    const expiresIn = params.expiresInSeconds ?? 60 * 5;
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: params.contentType,
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: this.config.get<string>('KMS_KEY_ID'),
    });
    const url = await getSignedUrl(this.client, cmd, { expiresIn });
    return { url, expiresAt: new Date(Date.now() + expiresIn * 1000) };
  }

  async presignDownload(params: {
    key: string;
    filename?: string;
    expiresInSeconds?: number;
  }): Promise<string> {
    const expiresIn = params.expiresInSeconds ?? 60;
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ResponseContentDisposition: params.filename
        ? `attachment; filename="${params.filename.replace(/"/g, '')}"`
        : undefined,
    });
    return getSignedUrl(this.client, cmd, { expiresIn });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    this.logger.log(`Deleted S3 object ${key}`);
  }
}
