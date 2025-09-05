import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { authMiddleware, AuthenticatedRequest } from "../../middleware/auth";
import { bruteForceGuard } from "../../../utils/BruteForceGuard";
import { S3Service } from "../../../services/S3Service";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

// Upload limits: adjust sizes as needed (bytes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
    files: 1,
  },
});

// Centralized rate limiter
const rateLimit = (routeKey: string, maxReq = 60, windowMs = 15 * 60 * 1000) =>
  bruteForceGuard.rateLimit(routeKey, maxReq, windowMs);

// Require auth for uploads
router.use(authMiddleware);

router.post(
  "/",
  rateLimit("upload:file", 60),
  upload.single("file"),
  asyncHandler(async (
    req: AuthenticatedRequest & { file?: Express.Multer.File },
    res: Response
  ) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.user?.id || "anonymous";
    const now = new Date();
    const datePrefix = `${now.getUTCFullYear()}/${String(
      now.getUTCMonth() + 1
    ).padStart(2, "0")}/${String(now.getUTCDate()).padStart(2, "0")}`;
    const ext = path.extname(file.originalname || "").toLowerCase();
    const rand = randomUUID();
    const key = `uploads/${userId}/${datePrefix}/${rand}${ext}`;

    const s3 = S3Service.getInstance();
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

export default router;
