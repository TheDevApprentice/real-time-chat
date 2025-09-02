import { Router } from "express";
import chatRouter from "./chat";
import userRouter from "./user";
import authRouter from "./auth";

const router = Router();

// Controllers/routes
router.use("/", chatRouter);
router.use("/user", userRouter);
router.use("/auth", authRouter);

export default router;