/**
 * Split Calculation Service
 * Computes per-user amount_owed for each split type.
 * All amounts in INR (₹).
 */

/**
 * EQUAL split: divide total equally among selected participants.
 * @param {number} totalAmount
 * @param {string[]} userIds - selected participant IDs
 * @returns {{ userId, amountOwed }[]}
 */
export const calculateEqualSplit = (totalAmount, userIds) => {
  if (!userIds || userIds.length === 0) {
    throw new Error('At least one participant is required.');
  }
  const perPerson = parseFloat((totalAmount / userIds.length).toFixed(2));
  // Handle rounding remainder on the last person
  const remainder = parseFloat(
    (totalAmount - perPerson * (userIds.length - 1)).toFixed(2)
  );

  return userIds.map((userId, index) => ({
    userId,
    amountOwed: index === userIds.length - 1 ? remainder : perPerson,
    percentage: null,
    shares: null,
  }));
};

/**
 * UNEQUAL split: each user has a manually entered amount.
 * @param {number} totalAmount
 * @param {{ userId: string, amount: number }[]} splits
 * @returns {{ userId, amountOwed }[]}
 */
export const calculateUnequalSplit = (totalAmount, splits) => {
  const sum = splits.reduce((acc, s) => acc + parseFloat(s.amount), 0);
  if (Math.abs(sum - totalAmount) > 0.01) {
    throw new Error(
      `Split amounts (${sum}) must equal total expense amount (${totalAmount}).`
    );
  }
  return splits.map((s) => ({
    userId: s.userId,
    amountOwed: parseFloat(parseFloat(s.amount).toFixed(2)),
    percentage: null,
    shares: null,
  }));
};

/**
 * PERCENTAGE split: each user has a percentage; must sum to 100.
 * @param {number} totalAmount
 * @param {{ userId: string, percentage: number }[]} splits
 * @returns {{ userId, amountOwed, percentage }[]}
 */
export const calculatePercentageSplit = (totalAmount, splits) => {
  const totalPct = splits.reduce((acc, s) => acc + parseFloat(s.percentage), 0);
  if (Math.abs(totalPct - 100) > 0.01) {
    throw new Error(`Total percentage (${totalPct}%) must equal 100%.`);
  }
  return splits.map((s) => ({
    userId: s.userId,
    amountOwed: parseFloat(((totalAmount * s.percentage) / 100).toFixed(2)),
    percentage: parseFloat(s.percentage),
    shares: null,
  }));
};

/**
 * SHARES split: each user has integer shares; total must be > 0.
 * @param {number} totalAmount
 * @param {{ userId: string, shares: number }[]} splits
 * @returns {{ userId, amountOwed, shares }[]}
 */
export const calculateSharesSplit = (totalAmount, splits) => {
  const totalShares = splits.reduce((acc, s) => acc + parseInt(s.shares), 0);
  if (totalShares <= 0) {
    throw new Error('Total shares must be greater than zero.');
  }
  return splits.map((s) => ({
    userId: s.userId,
    amountOwed: parseFloat(
      ((totalAmount * parseInt(s.shares)) / totalShares).toFixed(2)
    ),
    percentage: null,
    shares: parseInt(s.shares),
  }));
};

/**
 * Main dispatcher — routes to the correct calculation based on splitType.
 */
export const calculateSplits = (totalAmount, splitType, splitData) => {
  switch (splitType) {
    case 'EQUAL':
      return calculateEqualSplit(totalAmount, splitData.userIds);
    case 'UNEQUAL':
      return calculateUnequalSplit(totalAmount, splitData.splits);
    case 'PERCENTAGE':
      return calculatePercentageSplit(totalAmount, splitData.splits);
    case 'SHARES':
      return calculateSharesSplit(totalAmount, splitData.splits);
    default:
      throw new Error(`Unknown split type: ${splitType}`);
  }
};
