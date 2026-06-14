import * as messageService from '../services/message.service.js';

export const getMessages = async (req, res, next) => {
  try {
    const messages = await messageService.getExpenseMessages(req.params.expenseId, req.user.id);
    return res.status(200).json({ success: true, data: messages });
  } catch (err) { next(err); }
};

export const createMessage = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Message content is required.', statusCode: 400 });
    const message = await messageService.createMessage(req.params.expenseId, req.user.id, content);
    return res.status(201).json({ success: true, data: message });
  } catch (err) { next(err); }
};
