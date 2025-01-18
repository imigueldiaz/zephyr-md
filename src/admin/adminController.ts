import { Request, Response } from 'express';
import { TemplateEngine } from '../templateEngine';
import { Config } from '../types';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configurar multer para el almacenamiento de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'content', 'posts');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Usar la fecha actual + nombre original para evitar colisiones
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        cb(null, `${timestamp}-${file.originalname}`);
    }
});

const upload = multer({ storage });

/**
 * Render upload form
 */
export const renderUploadForm = async (req: Request, res: Response): Promise<void> => {
    try {
        const config = req.app.locals.config as Config;
        const templateEngine = new TemplateEngine(config);
        const html = await templateEngine.renderTemplate('upload', {});
        res.send(html);
    } catch (error) {
        console.error('Error rendering upload form:', error);
        res.status(500).send('Error rendering upload form');
    }
};

/**
 * Handle file upload
 */
export const handleUpload = async (req: Request, res: Response): Promise<void> => {
    try {
        // Si es una petición de verificación, responder OK
        if (req.body && req.body.action === 'verify') {
            res.json({ message: 'Token valid' });
            return;
        }

        // Procesar el archivo
        upload.single('markdown')(req, res, async (err) => {
            if (err) {
                console.error('Upload error:', err);
                res.status(400).json({ message: 'Error uploading file' });
                return;
            }

            if (!req.file) {
                res.status(400).json({ message: 'No file uploaded' });
                return;
            }

            const { title, tags, language } = req.body;
            
            // TODO: Procesar el archivo markdown y crear el post

            res.json({
                message: 'File uploaded successfully',
                file: {
                    filename: req.file.filename,
                    title,
                    tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : [],
                    language
                }
            });
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
