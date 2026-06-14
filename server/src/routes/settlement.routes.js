import { Router } from 'express';
import { recordSettlement } from '../controllers/settlement.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();
router.use(verifyToken);
router.post('/', recordSettlement);

export default router;
