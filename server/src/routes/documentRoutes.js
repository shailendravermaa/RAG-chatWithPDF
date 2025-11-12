import express from 'express';
import { uploadDocument, getDocument } from '../controllers/documentController.js';
import { uploadSingle, validateFileUpload, handleUploadError } from '../middleware/uploadMiddleware.js';
import { validateDocumentId } from '../middleware/validateRequest.js';

const router = express.Router();

/**
 * POST /api/documents/upload
 * Upload a PDF document for processing
 */
router.post(
  '/upload',
  uploadSingle,
  handleUploadError,
  validateFileUpload,
  uploadDocument
);

/**
 * GET /api/documents/:id
 * Get document metadata by ID
 */
router.get('/:id', validateDocumentId, getDocument);

export default router;
