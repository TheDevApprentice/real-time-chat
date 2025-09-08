import { S3Client, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { IS3Service } from "../../interfaces/storageInterface/IS3Service";

export class S3Service implements IS3Service {
  private static instance: S3Service;
  private client: S3Client;
  private bucket: string;
  private publicBase?: string;

  private constructor() {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION || "us-east-1";
    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;
    const usePathStyle =
      (process.env.S3_USE_PATH_STYLE || "true").toLowerCase() === "true";
    const bucket = process.env.S3_BUCKET;

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        "Missing S3 configuration. Please set S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET"
      );
    }

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: usePathStyle,
      credentials: { accessKeyId, secretAccessKey },
    });

    this.bucket = bucket;
    this.publicBase = process.env.S3_PUBLIC_URL_BASE;
  }

  public static getInstance(): S3Service {
    if (!S3Service.instance) {
      S3Service.instance = new S3Service();
    }
    return S3Service.instance;
  }

  public async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string
  ): Promise<{ key: string; url: string }> {
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });
    await this.client.send(cmd);

    const url = this.publicBase
      ? `${this.publicBase.replace(/\/$/, "")}/${key}`
      : this.defaultPublicUrl(key);

    return { key, url };
  }

  public async copyObject(srcKey: string, dstKey: string): Promise<void> {
    const cmd = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `/${this.bucket}/${srcKey}`,
      Key: dstKey,
    });
    await this.client.send(cmd);
  }

  public async deleteObject(key: string): Promise<void> {
    const cmd = new DeleteObjectCommand({ Bucket: this.bucket, Key: key });
    await this.client.send(cmd);
  }

  public publicUrl(key: string): string {
    return this.publicBase
      ? `${this.publicBase.replace(/\/$/, "")}/${key}`
      : this.defaultPublicUrl(key);
  }

  private defaultPublicUrl(key: string): string {
    // Fallback for when S3_PUBLIC_URL_BASE isn't set. Works for MinIO with path-style and public bucket
    const base = process.env.S3_ENDPOINT || "";
    const trimmed = base.replace(/\/$/, "");
    return `${trimmed}/${this.bucket}/${key}`;
  }
}
