import prisma from '../config/prisma.js';

/**
 * Net balance formula (per user per group):
 * balance = totalPaid - totalOwed + settlementsReceived - settlementsPaid
 *
 * Positive → user is owed money
 * Negative → user owes money
 * Zero     → fully settled
 */
export const getUserBalanceInGroup = async (userId, groupId) => {
  // Total amount this user paid for expenses in this group
  const expensesPaid = await prisma.expense.aggregate({
    where: { groupId, paidById: userId },
    _sum: { amountInInr: true },
  });

  // Total amount this user owes (from expense splits in this group)
  const splitsOwed = await prisma.expenseSplit.aggregate({
    where: {
      userId,
      expense: { groupId },
    },
    _sum: { amountOwed: true },
  });

  // Total settlements received by this user in this group
  const settlementsReceived = await prisma.settlement.aggregate({
    where: { groupId, paidToId: userId },
    _sum: { amount: true },
  });

  // Total settlements paid by this user in this group
  const settlementsPaid = await prisma.settlement.aggregate({
    where: { groupId, paidById: userId },
    _sum: { amount: true },
  });

  const paid = parseFloat(expensesPaid._sum.amountInInr || 0);
  const owed = parseFloat(splitsOwed._sum.amountOwed || 0);
  const received = parseFloat(settlementsReceived._sum.amount || 0);
  const settled = parseFloat(settlementsPaid._sum.amount || 0);

  return parseFloat((paid - owed + received - settled).toFixed(2));
};

/**
 * Returns detailed breakdown of a user's balance in a group, showing exactly which expenses
 * and settlements make up the final number.
 */
export const getBalanceDetailInGroup = async (userId, groupId) => {
  const expensesPaid = await prisma.expense.findMany({
    where: { groupId, paidById: userId },
    select: { id: true, description: true, amountInInr: true, expenseDate: true },
  });

  const splitsOwed = await prisma.expenseSplit.findMany({
    where: { userId, expense: { groupId } },
    include: { expense: { select: { id: true, description: true, expenseDate: true } } },
  });

  const settlementsReceived = await prisma.settlement.findMany({
    where: { groupId, paidToId: userId },
    select: { id: true, note: true, amount: true, createdAt: true, paidBy: { select: { name: true } } },
  });

  const settlementsPaid = await prisma.settlement.findMany({
    where: { groupId, paidById: userId },
    select: { id: true, note: true, amount: true, createdAt: true, paidTo: { select: { name: true } } },
  });

  return {
    expensesPaid: expensesPaid.map(e => ({ ...e, amount: parseFloat(e.amountInInr) })),
    splitsOwed: splitsOwed.map(s => ({ 
      id: s.expense.id, 
      description: s.expense.description, 
      expenseDate: s.expense.expenseDate, 
      amountOwed: parseFloat(s.amountOwed) 
    })),
    settlementsReceived: settlementsReceived.map(s => ({ ...s, amount: parseFloat(s.amount) })),
    settlementsPaid: settlementsPaid.map(s => ({ ...s, amount: parseFloat(s.amount) }))
  };
};

/**
 * Returns a flat list of who owes whom in a group.
 * No debt simplification — raw pair-wise balances.
 */
export const getGroupWhoOwesWhom = async (groupId) => {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const userIds = members.map((m) => m.userId);

  // Build net balance map for each user
  const balances = {};
  for (const userId of userIds) {
    balances[userId] = await getUserBalanceInGroup(userId, groupId);
  }

  // Derive who owes whom using creditor/debtor separation
  const creditors = []; // positive balance — owed money
  const debtors = [];   // negative balance — owe money

  for (const [userId, balance] of Object.entries(balances)) {
    if (balance > 0) creditors.push({ userId, amount: balance });
    if (balance < 0) debtors.push({ userId, amount: Math.abs(balance) });
  }

  const result = [];

  // Simple pair-wise debt assignment
  for (const debtor of debtors) {
    for (const creditor of creditors) {
      if (debtor.amount <= 0 || creditor.amount <= 0) continue;

      const settleAmount = Math.min(debtor.amount, creditor.amount);
      const debtorUser = members.find((m) => m.userId === debtor.userId)?.user;
      const creditorUser = members.find((m) => m.userId === creditor.userId)?.user;

      result.push({
        from: debtorUser,
        to: creditorUser,
        amount: parseFloat(settleAmount.toFixed(2)),
      });

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;
    }
  }

  return result;
};

/**
 * Personal balance summary across ALL groups.
 */
export const getPersonalBalanceSummary = async (userId) => {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: { group: true },
  });

  let totalOwed = 0;
  let totalReceivable = 0;

  for (const { groupId } of memberships) {
    const balance = await getUserBalanceInGroup(userId, groupId);
    if (balance < 0) totalOwed += Math.abs(balance);
    if (balance > 0) totalReceivable += balance;
  }

  return {
    totalOwed: parseFloat(totalOwed.toFixed(2)),
    totalReceivable: parseFloat(totalReceivable.toFixed(2)),
    netBalance: parseFloat((totalReceivable - totalOwed).toFixed(2)),
  };
};
