import { Router } from 'express';

const router = Router();

import chatRouter from './chat';

// Controllers/routes
router.use('/chat', chatRouter);

// TODO: Import and mount more controllers here

export default router;
