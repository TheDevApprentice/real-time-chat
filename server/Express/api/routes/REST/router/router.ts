import { Router } from "express";
import chatController from "../controllers/ChatController";
import userController from "../controllers/UserController";
import authController from "../controllers/AuthController";
import uploadController from "../controllers/UploadController";
import { errorHandler } from "../middleware/errorHandler";

const router = Router();

// Controllers/routes
router.use("/chat", chatController);
router.use("/user", userController);
router.use("/auth", authController);
router.use("/upload", uploadController);

// Global REST error handler (must be last)
router.use(errorHandler);

export default router;
