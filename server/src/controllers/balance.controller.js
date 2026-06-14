import { getGroupWhoOwesWhom, getPersonalBalanceSummary, getUserBalanceInGroup, getBalanceDetailInGroup } from '../services/balance.service.js';
import { assertMembership } from '../services/group.service.js';

export const getGroupBalances = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    await assertMembership(groupId, req.user.id);
    const balances = await getGroupWhoOwesWhom(groupId);
    return res.status(200).json({ success: true, data: balances });
  } catch (err) { next(err); }
};

export const getPersonalBalances = async (req, res, next) => {
  try {
    const summary = await getPersonalBalanceSummary(req.user.id);
    return res.status(200).json({ success: true, data: summary });
  } catch (err) { next(err); }
};

export const getUserGroupBalance = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    await assertMembership(groupId, req.user.id);
    const balance = await getUserBalanceInGroup(req.user.id, groupId);
    return res.status(200).json({ success: true, data: { balance } });
  } catch (err) { next(err); }
};

export const getGroupBalanceDetail = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    await assertMembership(groupId, req.user.id);
    const detail = await getBalanceDetailInGroup(req.user.id, groupId);
    return res.status(200).json({ success: true, data: detail });
  } catch (err) { next(err); }
};
