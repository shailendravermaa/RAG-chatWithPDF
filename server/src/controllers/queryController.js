import { AppError } from '../middleware/errorHandler.js';
import * as queryService from '../services/queryService.js';
import { getDocuments } from './documentController.js';

/**
 * Handle user query about a document
 * POST /api/query
 */
export const handleQuery = async (req, res, next) => {
  try {
    const { documentId, question, history = [] } = req.body;
    
    // Check if document exists and is ready
    const documents = getDocuments();
    const document = documents.get(documentId);
    
    if (!document) {
      throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }
    
    if (document.status === 'processing') {
      throw new AppError(
        'Document is still being processed. Please try again in a moment.',
        400,
        'DOCUMENT_PROCESSING'
      );
    }
    
    if (document.status === 'failed') {
      throw new AppError(
        `Document processing failed: ${document.error || 'Unknown error'}. Please upload the document again.`,
        400,
        'DOCUMENT_FAILED'
      );
    }
    
    // Validate document is ready
    if (document.status !== 'ready') {
      throw new AppError(
        'Document is not ready for queries',
        400,
        'DOCUMENT_NOT_READY'
      );
    }
    
    // Process the query
    const result = await queryService.processQuery(documentId, question, history);
    
    res.json({
      success: true,
      answer: result.answer,
      timestamp: result.timestamp
    });
  } catch (error) {
    // Log the error with context
    console.error(`Error handling query for document ${req.body.documentId}:`, error.message);
    next(error);
  }
};
