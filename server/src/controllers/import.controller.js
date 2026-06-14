import { previewImport, confirmImport } from '../services/import.service.js';

export const handlePreviewImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No CSV file provided.' });
    }
    const result = await previewImport(req.file.buffer);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const handleConfirmImport = async (req, res, next) => {
  try {
    const { groupId, rows, exchangeRate } = req.body;
    if (!groupId || !rows || !Array.isArray(rows)) {
      return res.status(400).json({ success: false, message: 'groupId and rows are required.' });
    }
    const result = await confirmImport(groupId, rows, exchangeRate || 83);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
