import { Router } from 'express';
import {
  createExpense, getExpenseById, updateExpense, deleteExpense,
} from '../controllers/expense.controller.js';
import { getMessages, createMessage } from '../controllers/message.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyToken);

router.post('/', createExpense);
router.get('/:expenseId', getExpenseById);
router.patch('/:expenseId', updateExpense);
router.delete('/:expenseId', deleteExpense);

// Chat
router.get('/:expenseId/messages', getMessages);
router.post('/:expenseId/messages', createMessage);

export default router;
