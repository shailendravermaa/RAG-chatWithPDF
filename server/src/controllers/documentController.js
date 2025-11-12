import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import * as documentService from '../services/documentService.js';
import fs from 'fs/promises';

// In-memory storage for document metadata
// In production, this should be replaced with a database
const documents = new Map();

/**
 * Upload and process a PDF document
 * POST /api/documents/upload
 */
export const uploadDocument = async (req, res, next) => {
  let filePath = null;
  
  try {
    // File validation is handled by uploadMiddleware
    const file = req.file;
    
    if (!file) {
      throw new AppError('No file uploaded', 400, 'NO_FILE_UPLOADED');
    }

    filePath = file.path;

    // Additional file validation
    if (file.size === 0) {
      // Clean up empty file
      await fs.unlink(filePath).catch(() => {});
      throw new AppError('Uploaded file is empty', 400, 'EMPTY_FILE');
    }

    // Validate file name
    if (!file.originalname || file.originalname.trim().length === 0) {
      await fs.unlink(filePath).catch(() => {});
      throw new AppError('Invalid file name', 400, 'INVALID_FILE_NAME');
    }

    // Generate unique document ID
    const documentId = uuidv4();
    
    // Store initial document metadata
    documents.set(documentId, {
      documentId,
      fileName: file.originalname,
      uploadDate: new Date(),
      status: 'processing',
      filePath: file.path,
      fileSize: file.size
    });

    // Process document asynchronously
    // We'll return immediately and process in background
    documentService.processDocument(file.path, documentId, file.originalname)
      .then((result) => {
        // Update document metadata with processing results
        const doc = documents.get(documentId);
        if (doc) {
          documents.set(documentId, {
            ...doc,
            status: 'ready',
            pageCount: result.pageCount,
            chunkCount: result.chunkCount
          });
        }
        
        // Clean up temporary file after successful processing
        fs.unlink(file.path).catch(err => {
          console.error('Failed to delete temporary file:', err);
        });
      })
      .catch((error) => {
        // Update status to failed
        const doc = documents.get(documentId);
        if (doc) {
          documents.set(documentId, {
            ...doc,
            status: 'failed',
            error: error.message
          });
          console.error(`Document processing failed: ${documentId} - ${error.message}`);
        }
        
        // Clean up temporary file after failed processing
        fs.unlink(file.path).catch(err => {
          console.error('Failed to delete temporary file:', err);
        });
      });

    // Return success response immediately
    res.status(201).json({
      success: true,
      documentId,
      fileName: file.originalname,
      message: 'Document uploaded and processing started'
    });
  } catch (error) {
    // Clean up file if error occurs before processing starts
    if (filePath) {
      await fs.unlink(filePath).catch(() => {});
    }
    next(error);
  }
};

/**
 * Get document metadata by ID
 * GET /api/documents/:id
 */
export const getDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const document = documents.get(id);
    
    if (!document) {
      throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // Return document metadata without internal file path
    const { filePath, ...documentData } = document;
    
    res.json({
      success: true,
      document: documentData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export documents map for use in other modules if needed
 */
export const getDocuments = () => documents;
