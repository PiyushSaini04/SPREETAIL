import prisma from '../config/prisma.js';
import { AppError } from '../middleware/error.middleware.js';
import { assertMembership } from './group.service.js';

export const recordSettlement = async ({
  groupId,
  paidById,
  paidToId,
  amount,
  note,
}) => {
  await assertMembership(groupId, paidById);
  await assertMembership(groupId, paidToId);

  if (paidById === paidToId) {
    throw new AppError('Cannot record a settlement with yourself.', 400);
  }
  if (parseFloat(amount) <= 0) {
    throw new AppError('Settlement amount must be greater than zero.', 400);
  }

  return prisma.settlement.create({
    data: {
      groupId,
      paidById,
      paidToId,
      amount: parseFloat(amount),
      note: note || null,
    },
    include: {
      paidBy: { select: { id: true, name: true, email: true } },
      paidTo: { select: { id: true, name: true, email: true } },
    },
  });
};

export const getGroupSettlements = async (groupId, userId) => {
  await assertMembership(groupId, userId);
  return prisma.settlement.findMany({
    where: { groupId },
    orderBy: { createdAt: 'desc' },
    include: {
      paidBy: { select: { id: true, name: true, email: true } },
      paidTo: { select: { id: true, name: true, email: true } },
    },
  });
};
