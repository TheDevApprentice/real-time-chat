import { Router } from "express";
import chatController from "../controllers/ChatController";
import userController from "../controllers/UserController";
import authController from "../controllers/AuthController";
import uploadController from "../controllers/UploadController";

const router = Router();

// Controllers/routes
router.use("/chat", chatController);
router.use("/user", userController);
router.use("/auth", authController);
router.use("/upload", uploadController);

export default router;
