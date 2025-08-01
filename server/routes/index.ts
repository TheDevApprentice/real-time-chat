import { Router } from 'express';

const router = Router();

import chatRouter from './chat';

// Controllers/routes
router.use('/', chatRouter);
// Note: chat routes now available at /api

// TODO: Import and mount more controllers here

export default router;
