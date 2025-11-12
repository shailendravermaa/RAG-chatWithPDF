import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from './errorHandler.js';

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  }
});

// File filter - only allow PDF files
const fileFilter = (req, file, cb) => {
  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.pdf') {
    return cb(
      new AppError('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE'),
      false
    );
  }

  // Check MIME type
  if (file.mimetype !== 'application/pdf') {
    return cb(
      new AppError('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE'),
      false
    );
  }

  cb(null, true);
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // Default 10MB
  }
});

// Middleware to handle multer errors
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760;
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      return next(
        new AppError(
          `File size exceeds ${maxSizeMB}MB limit`,
          413,
          'FILE_TOO_LARGE'
        )
      );
    }
    return next(new AppError(err.message, 400, 'UPLOAD_ERROR'));
  }
  next(err);
};

// Export configured upload middleware
export const uploadSingle = upload.single('file');

// Middleware to validate file was uploaded
export const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded', 400, 'NO_FILE_UPLOADED'));
  }
  next();
};
