import { Router } from 'express';
import { getPersonalBalances, getGroupBalances, getUserGroupBalance, getGroupBalanceDetail } from '../controllers/balance.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();
router.use(verifyToken);
router.get('/me', getPersonalBalances);
router.get('/group/:groupId', getGroupBalances);
router.get('/group/:groupId/user', getUserGroupBalance);
router.get('/group/:groupId/detail', getGroupBalanceDetail);

export default router;
