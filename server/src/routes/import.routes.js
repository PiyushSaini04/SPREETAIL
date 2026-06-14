import express from 'express';
import multer from 'multer';
import { handlePreviewImport, handleConfirmImport } from '../controllers/import.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyToken);

router.post('/preview', upload.single('file'), handlePreviewImport);
router.post('/confirm', handleConfirmImport);

export default router;
