import { S3Client, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { IS3Service } from "../../interfaces/storageInterface/IS3Service";
import path from "path";
import { randomUUID } from "crypto";

export type FinalizeResult = {
  safeAppend: string; // text (possibly URLs) to append to message content (or empty string)
  normalizedKeys: string[];
  copyFailed: string[];
  finalUrls: string[];
};

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

  
  private normalize(rawAttachments: unknown): string[] {
    const attRaw: string[] = Array.isArray(rawAttachments) ? (rawAttachments as any[]).map(String) : [];
    const normalized: string[] = attRaw.map((raw) => {
      try {
        let v = String(raw || "");
        if (/^https?:\/\//i.test(v)) {
          const u = new URL(v);
          const parts = u.pathname.split("/").filter(Boolean);
          if (parts.length >= 2) v = parts.slice(1).join("/");
          else v = parts.join("/");
        }
        try { v = decodeURIComponent(v); } catch {}
        v = v.replace(/^\/+/, "");
        return v;
      } catch { return String(raw || ""); }
    });
    return normalized;
  }

  async finalize(roomId: string, userId: string, timestamp: number, attachments: unknown): Promise<FinalizeResult> {
    const normalized = this.normalize(attachments);
    if (normalized.length > 50) {
      throw new Error("Too many attachments (max 50).");
    }
    const out: FinalizeResult = { safeAppend: "", normalizedKeys: normalized.slice(), copyFailed: [], finalUrls: [] };

    if (!normalized.length || !this.client) {
      return out;
    }

    const now = new Date(timestamp);
    const datePrefix = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${String(now.getUTCDate()).padStart(2, "0")}`;
    const allowedExts = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".webm", ".ogg"]);

    for (const tmpKey of normalized) {
      if (typeof tmpKey !== "string" || !tmpKey.startsWith("uploads/tmp/")) continue;
      const parts = tmpKey.split("/").filter(Boolean);
      if (parts.length < 3) continue;
      const ext = (path.extname(tmpKey) || "").toLowerCase();
      if (!allowedExts.has(ext)) continue;
      const finalKey = `uploads/rooms/${roomId}/${datePrefix}/${randomUUID()}` + ext;
      try {
        await this.copyObject(tmpKey, finalKey);
        try { await this.deleteObject(tmpKey); } catch {}
        const url = this.publicUrl(finalKey);
        out.finalUrls.push(url);
      } catch {
        out.copyFailed.push(tmpKey);
      }
    }

    if (out.finalUrls.length > 0) {
      out.safeAppend = out.finalUrls.join("\n");
    }
    return out;
  }

  private defaultPublicUrl(key: string): string {
    // Fallback for when S3_PUBLIC_URL_BASE isn't set. Works for MinIO with path-style and public bucket
    const base = process.env.S3_ENDPOINT || "";
    const trimmed = base.replace(/\/$/, "");
    return `${trimmed}/${this.bucket}/${key}`;
  }
}
