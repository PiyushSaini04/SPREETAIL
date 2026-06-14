import { Router } from 'express';
import { register, login, getMe, searchUsers } from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, getMe);
router.get('/users/search', verifyToken, searchUsers);

export default router;
