import { AppError } from './errorHandler.js';

// Middleware to validate required fields in request body
export const validateFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];

    for (const field of requiredFields) {
      if (!req.body[field] && req.body[field] !== 0 && req.body[field] !== false) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return next(
        new AppError(
          `Missing required fields: ${missingFields.join(', ')}`,
          400,
          'VALIDATION_ERROR'
        )
      );
    }

    next();
  };
};

// Middleware to validate document ID format
export const validateDocumentId = (req, res, next) => {
  const documentId = req.params.id || req.body.documentId;

  if (!documentId) {
    return next(
      new AppError('Document ID is required', 400, 'VALIDATION_ERROR')
    );
  }

  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(documentId)) {
    return next(
      new AppError('Invalid document ID format', 400, 'VALIDATION_ERROR')
    );
  }

  next();
};

// Middleware to validate query request
export const validateQueryRequest = (req, res, next) => {
  const { documentId, question, history } = req.body;

  // Validate documentId
  if (!documentId) {
    return next(
      new AppError('Document ID is required', 400, 'VALIDATION_ERROR')
    );
  }

  if (typeof documentId !== 'string') {
    return next(
      new AppError('Document ID must be a string', 400, 'VALIDATION_ERROR')
    );
  }

  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(documentId)) {
    return next(
      new AppError('Invalid document ID format', 400, 'VALIDATION_ERROR')
    );
  }

  // Validate question
  if (!question) {
    return next(
      new AppError('Question is required', 400, 'VALIDATION_ERROR')
    );
  }

  if (typeof question !== 'string') {
    return next(
      new AppError('Question must be a string', 400, 'VALIDATION_ERROR')
    );
  }

  if (question.trim().length === 0) {
    return next(
      new AppError('Question cannot be empty', 400, 'VALIDATION_ERROR')
    );
  }

  if (question.length > 5000) {
    return next(
      new AppError('Question is too long (maximum 5000 characters)', 400, 'VALIDATION_ERROR')
    );
  }

  // Validate history if provided
  if (history !== undefined) {
    if (!Array.isArray(history)) {
      return next(
        new AppError('History must be an array', 400, 'VALIDATION_ERROR')
      );
    }

    // Validate each history item
    for (let i = 0; i < history.length; i++) {
      const item = history[i];
      
      if (!item || typeof item !== 'object') {
        return next(
          new AppError(`History item ${i} must be an object`, 400, 'VALIDATION_ERROR')
        );
      }

      if (!item.role || !item.content) {
        return next(
          new AppError(`History item ${i} must have 'role' and 'content' fields`, 400, 'VALIDATION_ERROR')
        );
      }

      if (item.role !== 'user' && item.role !== 'model') {
        return next(
          new AppError(`History item ${i} role must be 'user' or 'model'`, 400, 'VALIDATION_ERROR')
        );
      }

      if (typeof item.content !== 'string') {
        return next(
          new AppError(`History item ${i} content must be a string`, 400, 'VALIDATION_ERROR')
        );
      }
    }

    // Limit history size to prevent abuse
    if (history.length > 100) {
      return next(
        new AppError('History is too long (maximum 100 messages)', 400, 'VALIDATION_ERROR')
      );
    }
  }

  next();
};
