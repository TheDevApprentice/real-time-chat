import path from "path";
import { randomUUID } from "crypto";
import { IS3Service } from "../../interfaces/storageInterface/IS3Service";

export type FinalizeResult = {
  safeAppend: string; // text (possibly URLs) to append to message content (or empty string)
  normalizedKeys: string[];
  copyFailed: string[];
  finalUrls: string[];
};

export class AttachmentFinalizer {
  constructor(private readonly s3Service: IS3Service | undefined) {}

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

    if (!normalized.length || !this.s3Service) {
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
        await this.s3Service.copyObject(tmpKey, finalKey);
        try { await this.s3Service.deleteObject(tmpKey); } catch {}
        const url = this.s3Service.publicUrl(finalKey);
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
}
