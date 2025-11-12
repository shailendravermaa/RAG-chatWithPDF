import express from 'express';
import { handleQuery } from '../controllers/queryController.js';
import { validateQueryRequest } from '../middleware/validateRequest.js';

const router = express.Router();

/**
 * POST /api/query
 * Process a user question about a document
 */
router.post('/', validateQueryRequest, handleQuery);

export default router;
