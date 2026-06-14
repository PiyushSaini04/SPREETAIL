import prisma from '../config/prisma.js';
import { AppError } from '../middleware/error.middleware.js';
import { assertMembership } from './group.service.js';

export const getExpenseMessages = async (expenseId, userId) => {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense) throw new AppError('Expense not found.', 404);
  await assertMembership(expense.groupId, userId);

  return prisma.message.findMany({
    where: { expenseId },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
};

export const createMessage = async (expenseId, userId, content) => {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense) throw new AppError('Expense not found.', 404);
  await assertMembership(expense.groupId, userId);

  if (!content || content.trim() === '') {
    throw new AppError('Message content cannot be empty.', 400);
  }

  return prisma.message.create({
    data: { expenseId, userId, content: content.trim() },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
};
