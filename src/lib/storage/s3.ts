import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { StorageError, type ObjectStorage, type PutOptions } from "./types"

export interface S3StorageConfig {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  /**
   * Required for non-AWS S3-compatible providers (R2, MinIO) which expect
   * `https://<endpoint>/<bucket>/<key>` rather than virtual-host style.
   * AWS S3 itself works either way; defaulting to `true` keeps the surface
   * portable.
   */
  forcePathStyle?: boolean
}

const DEFAULT_TTL_SECONDS = 15 * 60

export class S3Storage implements ObjectStorage {
  private readonly client: S3Client
  private readonly bucket: string

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle ?? true,
    })
  }

  async put(key: string, body: Buffer, opts: PutOptions): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: opts.contentType,
          ContentLength: opts.size,
        })
      )
    } catch (error) {
      throw new StorageError(`Failed to put ${key}`, { cause: error })
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
      )
    } catch (error) {
      throw new StorageError(`Failed to delete ${key}`, { cause: error })
    }
  }

  async signedReadUrl(key: string, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<string> {
    try {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: key })
      return await getSignedUrl(this.client, command, { expiresIn: ttlSeconds })
    } catch (error) {
      throw new StorageError(`Failed to sign read URL for ${key}`, { cause: error })
    }
  }
}
