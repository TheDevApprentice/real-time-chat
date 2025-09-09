import { Router, Response, Request } from "express";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { authMiddleware, AuthenticatedRequest } from "../../../middleware/auth";
import { rateLimitRedis } from "../../../middleware/rateLimitRedis";
import { bruteForceRedis } from "../../../middleware/bruteForceRedis";
import { TTL } from "../../../cache/cacheKeys";
import { asyncHandler } from "../middleware/asyncHandler";
import { getServices } from "../../../di/container";

const router = Router();

// Upload limits: adjust sizes as needed (bytes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
    files: 1,
  },
});

// Redis-backed, cluster-safe rate limiter
const rateLimit = (routeKey: string, maxReq = 60, windowSec = TTL.rateWindowAuth) =>
  rateLimitRedis(routeKey, maxReq, windowSec);

// Require auth for uploads
router.use(authMiddleware);

router.post(
  "/",
  rateLimit("upload:file", 60),
  bruteForceRedis({
    action: "upload:file",
    keyFrom: (req) => String((req as any)?.user?.id || req.ip || "unknown"),
    maxAttempts: 120,
  }),
  upload.single("file"),
  asyncHandler(async (
    req: AuthenticatedRequest & { file?: Express.Multer.File },
    res: Response
  ) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    // Basic MIME whitelist for images/videos
    const okMime = (
      (file.mimetype || "").startsWith("image/") ||
      (file.mimetype || "").startsWith("video/")
    );
    if (!okMime) {
      return res.status(415).json({ error: "Unsupported media type" });
    }

    const userId = req.user?.id || "anonymous";
    const now = new Date();
    const datePrefix = `${now.getUTCFullYear()}/${String(
      now.getUTCMonth() + 1
    ).padStart(2, "0")}/${String(now.getUTCDate()).padStart(2, "0")}`;
    const ext = path.extname(file.originalname || "").toLowerCase();
    const allowedExts = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".webm", ".ogg"]);
    if (!allowedExts.has(ext)) {
      return res.status(415).json({ error: "Unsupported file extension" });
    }
    const rand = randomUUID();
    const isTemp = String((req.query?.temp as any) ?? "1") === "1";
    const roomId = String((req.query?.roomId as any) ?? "");
    let key: string;
    if (isTemp) {
      if (!roomId) return res.status(400).json({ error: "Missing roomId for temp upload" });
      key = `uploads/tmp/${roomId}/${userId}/${datePrefix}/${rand}${ext}`;
    } else {
      key = `uploads/${userId}/${datePrefix}/${rand}${ext}`;
    }

    const s3 = getServices().s3Service;
    const { url } = await s3.uploadBuffer(
      file.buffer,
      key,
      file.mimetype || "application/octet-stream"
    );

    return res
      .status(201)
      .json({ url, key, size: file.size, contentType: file.mimetype });
  })
);

// Delete temporary uploads (cleanup when message is canceled)
router.delete(
  "/",
  rateLimit("upload:delete", 60),
  bruteForceRedis({
    action: "upload:delete",
    keyFrom: (req) => String((req as any)?.user?.id || req.ip || "unknown"),
    maxAttempts: 120,
  }),
  asyncHandler(async (req: AuthenticatedRequest & Request, res: Response) => {
    const { s3Service } = getServices() as any;
    const userId = req.user?.id || "anonymous";
    const body = (req as any).body as { keys?: string[] } | undefined;
    const keys = Array.isArray(body?.keys) ? body!.keys : [];
    if (!keys.length) return res.status(400).json({ error: "No keys provided" });
    const deleted: string[] = [];
    for (const k of keys) {
      const safe = typeof k === "string" ? k : "";
      // Only allow deletion of tmp objects owned by this user
      if (!safe.startsWith("uploads/tmp/")) continue;
      const parts = safe.split("/");
      // uploads/tmp/{roomId}/{userId}/...
      if (parts.length < 5) continue;
      const keyUser = parts[3];
      if (keyUser !== userId) continue;
      try {
        await s3Service.deleteObject(safe);
        deleted.push(safe);
      } catch {}
    }
    return res.json({ deleted });
  })
);

export default router;
