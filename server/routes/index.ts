import { Router } from 'express';

const router = Router();

import chatRouter from './chat';
import userRouter from './user';

// Controllers/routes
router.use('/', chatRouter);
router.use('/user', userRouter);
// Note: chat routes now available at /api

// TODO: Import and mount more controllers here

export default router;
