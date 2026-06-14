import prisma from '../config/prisma.js';
import { AppError } from '../middleware/error.middleware.js';
import { assertMembership } from './group.service.js';
import { calculateSplits } from './split.service.js';

const EXPENSE_INCLUDE = {
  createdBy: { select: { id: true, name: true, email: true } },
  paidBy: { select: { id: true, name: true, email: true } },
  splits: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  tags: { include: { tag: true } },
};

export const createExpense = async ({
  groupId,
  description,
  amountInInr,
  originalAmount,
  currency,
  exchangeRate,
  expenseDate,
  createdById,
  paidById,
  splitType,
  splitData,
  tagIds = [],
}) => {
  await assertMembership(groupId, createdById);

  // Validate paidBy is in the group
  await assertMembership(groupId, paidById);

  const parsedAmount = parseFloat(amountInInr);
  const splits = calculateSplits(parsedAmount, splitType, splitData);

  // Validate all split participants are group members
  for (const split of splits) {
    await assertMembership(groupId, split.userId, expenseDate || new Date());
  }

  const expense = await prisma.expense.create({
    data: {
      groupId,
      description,
      amountInInr: parsedAmount,
      originalAmount: originalAmount ? parseFloat(originalAmount) : null,
      currency: currency || "INR",
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : null,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      createdById,
      paidById,
      splitType,
      splits: {
        create: splits.map((s) => ({
          userId: s.userId,
          amountOwed: s.amountOwed,
          percentage: s.percentage,
          shares: s.shares,
        })),
      },
      tags: tagIds.length
        ? { create: tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: EXPENSE_INCLUDE,
  });

  return expense;
};

export const getExpenseById = async (expenseId, userId) => {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: EXPENSE_INCLUDE,
  });
  if (!expense) throw new AppError('Expense not found.', 404);
  await assertMembership(expense.groupId, userId);
  return expense;
};

export const updateExpense = async (expenseId, userId, updates) => {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense) throw new AppError('Expense not found.', 404);

  // Only creator or group admin can edit
  const { assertAdmin } = await import('./group.service.js');
  const isCreator = expense.createdById === userId;
  let isAdmin = false;
  try {
    await assertAdmin(expense.groupId, userId);
    isAdmin = true;
  } catch {}

  if (!isCreator && !isAdmin) {
    throw new AppError('Only the expense creator or group admin can edit this expense.', 403);
  }

  const {
    description,
    amountInInr,
    originalAmount,
    currency,
    exchangeRate,
    expenseDate,
    paidById,
    splitType,
    splitData,
    tagIds,
  } = updates;

  const parsedAmount = amountInInr ? parseFloat(amountInInr) : parseFloat(expense.amountInInr);
  const newSplitType = splitType || expense.splitType;
  const newSplits = splitData
    ? calculateSplits(parsedAmount, newSplitType, splitData)
    : null;

  return prisma.$transaction(async (tx) => {
    if (newSplits) {
      await tx.expenseSplit.deleteMany({ where: { expenseId } });
    }
    if (tagIds !== undefined) {
      await tx.expenseTag.deleteMany({ where: { expenseId } });
    }

    return tx.expense.update({
      where: { id: expenseId },
      data: {
        ...(description && { description }),
        ...(amountInInr && { amountInInr: parsedAmount }),
        ...(originalAmount !== undefined && { originalAmount: originalAmount ? parseFloat(originalAmount) : null }),
        ...(currency && { currency }),
        ...(exchangeRate !== undefined && { exchangeRate: exchangeRate ? parseFloat(exchangeRate) : null }),
        ...(expenseDate && { expenseDate: new Date(expenseDate) }),
        ...(paidById && { paidById }),
        ...(splitType && { splitType }),
        ...(newSplits && {
          splits: {
            create: newSplits.map((s) => ({
              userId: s.userId,
              amountOwed: s.amountOwed,
              percentage: s.percentage,
              shares: s.shares,
            })),
          },
        }),
        ...(tagIds !== undefined && tagIds.length > 0 && {
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        }),
      },
      include: EXPENSE_INCLUDE,
    });
  });
};

export const deleteExpense = async (expenseId, userId) => {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense) throw new AppError('Expense not found.', 404);

  const { assertAdmin } = await import('./group.service.js');
  const isCreator = expense.createdById === userId;
  let isAdmin = false;
  try {
    await assertAdmin(expense.groupId, userId);
    isAdmin = true;
  } catch {}

  if (!isCreator && !isAdmin) {
    throw new AppError('Only the expense creator or group admin can delete this expense.', 403);
  }

  return prisma.expense.delete({ where: { id: expenseId } });
};

export const getGroupExpenses = async (groupId, userId) => {
  await assertMembership(groupId, userId);
  return prisma.expense.findMany({
    where: { groupId },
    orderBy: { createdAt: 'desc' },
    include: EXPENSE_INCLUDE,
  });
};
