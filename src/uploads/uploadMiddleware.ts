import { Request } from 'express';
import multer from 'multer';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to only allow markdown files
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Accept both text/markdown and text/plain MIME types, but verify .md extension
    if (
        (file.mimetype === 'text/markdown' || 
         file.mimetype === 'text/plain' || 
         file.mimetype === 'application/octet-stream') && 
        file.originalname.toLowerCase().endsWith('.md')
    ) {
        cb(null, true);
    } else {
        cb(new Error('Only markdown (.md) files are allowed'));
    }
};

// Configure upload middleware
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});
