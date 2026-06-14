import { Router } from 'express';
import {
  createGroup, getUserGroups, getGroupById,
  addMember, removeMember, transferAdmin,
  leaveGroup, deleteGroup,
} from '../controllers/group.controller.js';
import { getGroupExpenses } from '../controllers/expense.controller.js';
import { getGroupBalances, getUserGroupBalance } from '../controllers/balance.controller.js';
import { getGroupSettlements } from '../controllers/settlement.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyToken);

router.post('/', createGroup);
router.get('/', getUserGroups);
router.get('/:groupId', getGroupById);
router.post('/:groupId/members', addMember);
router.delete('/:groupId/members/:userId', removeMember);
router.patch('/:groupId/transfer-admin', transferAdmin);
router.post('/:groupId/leave', leaveGroup);
router.delete('/:groupId', deleteGroup);

// Nested resources
router.get('/:groupId/expenses', getGroupExpenses);
router.get('/:groupId/balances', getGroupBalances);
router.get('/:groupId/balances/me', getUserGroupBalance);
router.get('/:groupId/settlements', getGroupSettlements);

export default router;
