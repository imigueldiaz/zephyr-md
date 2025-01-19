import express from 'express';
import { join } from 'path';
import { TemplateEngine } from './templateEngine';
import { MarkdownProcessor } from './markdownProcessor';
import { Config } from './types';
import { logger } from './logger';
import { mkdir } from 'fs/promises';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { readFile } from 'fs/promises';
import { login, loginValidation, renderLoginForm } from './auth/authController';
import { verifyToken } from './auth/authMiddleware';
import { upload } from './uploads/uploadMiddleware';
import { uploadMarkdown, validateMarkdownUpload } from './uploads/uploadController';
import { renderUploadForm, handleUpload } from './admin/adminController';
import cookieParser from 'cookie-parser';

export async function initialize() {
  // Crear directorio de logs si no existe
  try {
    await mkdir(join(__dirname, '../logs'), { recursive: true });
  } catch (error) {
    console.error('Error creating logs directory:', error);
  }

  async function loadConfig(): Promise<Config> {
    try {
      const configPath = join(__dirname, '../config.json');
      const configContent = await readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      return config;
    } catch (error) {
      console.error('Error loading config:', error);
      throw error;
    }
  }

  const config: Config = await loadConfig();
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT) : 8585;
  const host = process.env.HOST || 'localhost';
  const contentDir = join(__dirname, '../content');
  const themeFolder = config.site.siteTheme;

  // Add config to app.locals
  app.locals.config = config;

  // Middleware de seguridad
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "'unsafe-eval'",
          "cdnjs.cloudflare.com",
          "localhost:*"
        ],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "cdnjs.cloudflare.com", 
          "fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'", 
          "fonts.gstatic.com", 
          "cdnjs.cloudflare.com"
        ],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "localhost:*"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }));
  app.use(cookieParser());
  
  // Set secure cookie options
  app.set('trust proxy', 1); // trust first proxy if behind one
  app.use((req, res, next) => {
    res.cookie('cookieName', 'cookieValue', {
      httpOnly: true, // Prevents client-side access to cookies
      secure: process.env.NODE_ENV === 'production', // Requires HTTPS in production
      sameSite: 'strict', // Protects against CSRF
      path: '/', // Restrict cookie to root path
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // límite de 100 peticiones por ventana
  });
  app.use(limiter);

  // Rutas de autenticación y subida de archivos
  app.get('/admin/login', renderLoginForm);
  app.post('/admin/auth/login', loginValidation, login);
  app.get('/admin/upload', renderUploadForm);
  app.post('/admin/upload', verifyToken, handleUpload);

  // Serve static files
  app.use('/public', express.static(join(__dirname, '../public')));
  app.use('/styles', express.static(join(__dirname, '../templates', themeFolder, 'css')));
  app.use('/scripts', express.static(join(__dirname, '../templates', themeFolder, 'scripts')));

  // Log static file paths for debugging
  console.log('Static paths:', {
    public: join(__dirname, '../public'),
    styles: join(__dirname, '../templates', themeFolder, 'css'),
    scripts: join(__dirname, '../templates', themeFolder, 'scripts'),
    theme: config.site.siteTheme
  });

  // Initialize services
  const markdownProcessor = new MarkdownProcessor(contentDir);
  const templateEngine = new TemplateEngine(config);

  // Middleware para añadir CSS común a todas las páginas
  app.use((req, res, next) => {
    templateEngine.addCssFile('/styles/base.css');
    templateEngine.addCssFile('/styles/code.css');
    next();
  });

  // Routes
  app.get('/', async (req, res) => {
    try {
      const posts = await markdownProcessor.getAllPosts();
      const html = await templateEngine.renderIndex(posts);
      res.send(html);
    } catch (error) {
      logger.error('Error rendering index:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  app.get('/tags/:tag', async (req, res) => {
    try {
      const tag = req.params.tag;
      const posts = await markdownProcessor.getPostsByTag(tag);
      const html = await templateEngine.renderTagPage(tag, posts);
      res.send(html);
    } catch (error) {
      logger.error('Error rendering tag page:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  app.get('/posts/:slug', async (req, res) => {
    try {
      const slug = req.params.slug;
      const post = await markdownProcessor.getPost(slug);
      if (!post) {
        res.status(404).send('Post not found');
        return;
      }
      const html = await templateEngine.renderPost(post);
      res.send(html);
    } catch (error) {
      logger.error('Error rendering post:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // Start server
  app.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
  });
}

initialize().catch(console.error);
