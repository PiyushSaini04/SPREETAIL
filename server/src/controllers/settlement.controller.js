import * as settlementService from '../services/settlement.service.js';

export const recordSettlement = async (req, res, next) => {
  try {
    const { groupId, paidToId, amount, note } = req.body;
    if (!groupId || !paidToId || !amount) {
      return res.status(400).json({ success: false, message: 'groupId, paidToId, and amount are required.', statusCode: 400 });
    }
    const settlement = await settlementService.recordSettlement({
      groupId, paidById: req.user.id, paidToId, amount, note,
    });
    return res.status(201).json({ success: true, data: settlement });
  } catch (err) { next(err); }
};

export const getGroupSettlements = async (req, res, next) => {
  try {
    const settlements = await settlementService.getGroupSettlements(req.params.groupId, req.user.id);
    return res.status(200).json({ success: true, data: settlements });
  } catch (err) { next(err); }
};
