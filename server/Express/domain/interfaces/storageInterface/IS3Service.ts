import { FinalizeResult } from "../../services/storageServices/S3Service";

export interface IS3Service {
  uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string
  ): Promise<{ key: string; url: string }>;
  copyObject(srcKey: string, dstKey: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
  publicUrl(key: string): string;
  finalize(roomId: string, userId: string, ts: number, attachments: string[]): Promise<FinalizeResult>;
}