import { Router } from "express";
import chatRouter from "./chat";
import userRouter from "./user";
import authRouter from "./auth";
import uploadRouter from "./upload";

const router = Router();

// Controllers/routes
router.use("/chat", chatRouter);
router.use("/user", userRouter);
router.use("/auth", authRouter);
router.use("/upload", uploadRouter);

export default router;
