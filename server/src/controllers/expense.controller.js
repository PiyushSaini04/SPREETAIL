import * as expenseService from '../services/expense.service.js';

export const createExpense = async (req, res, next) => {
  try {
    const { groupId, description, amount, amountInInr, originalAmount, currency, exchangeRate, expenseDate, paidById, splitType, splitData, tagIds } = req.body;
    const finalAmountInInr = amountInInr || amount;
    if (!groupId || !description || !finalAmountInInr || !paidById || !splitType || !splitData) {
      return res.status(400).json({ success: false, message: 'groupId, description, amountInInr, paidById, splitType, and splitData are required.', statusCode: 400 });
    }
    const expense = await expenseService.createExpense({
      groupId, description, amountInInr: finalAmountInInr, originalAmount, currency, exchangeRate, expenseDate, createdById: req.user.id, paidById, splitType, splitData, tagIds,
    });
    return res.status(201).json({ success: true, data: expense });
  } catch (err) { next(err); }
};

export const getExpenseById = async (req, res, next) => {
  try {
    const expense = await expenseService.getExpenseById(req.params.expenseId, req.user.id);
    return res.status(200).json({ success: true, data: expense });
  } catch (err) { next(err); }
};

export const updateExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.updateExpense(req.params.expenseId, req.user.id, req.body);
    return res.status(200).json({ success: true, data: expense });
  } catch (err) { next(err); }
};

export const deleteExpense = async (req, res, next) => {
  try {
    await expenseService.deleteExpense(req.params.expenseId, req.user.id);
    return res.status(200).json({ success: true, data: { message: 'Expense deleted successfully.' } });
  } catch (err) { next(err); }
};

export const getGroupExpenses = async (req, res, next) => {
  try {
    const expenses = await expenseService.getGroupExpenses(req.params.groupId, req.user.id);
    return res.status(200).json({ success: true, data: expenses });
  } catch (err) { next(err); }
};
