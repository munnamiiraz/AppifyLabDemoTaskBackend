import { Request } from 'express';
import multer from 'multer';

// Types
export interface FileRequest extends Request {
  file: Express.Multer.File;
}

// Config
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10); // 5MB
const ALLOWED_TYPES = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif').split(',');

// Store file in memory as Buffer (NOT disk, NOT cloudinary-storage)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only JPEG, PNG, and GIF files are allowed.'));
  }
  cb(null, true);
};

// Multer instance
export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});
