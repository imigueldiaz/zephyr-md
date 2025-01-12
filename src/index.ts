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

  // Serve static files
  app.use('/public', express.static(join(__dirname, '../public')));
  app.use('/styles', express.static(join(__dirname, '../templates', themeFolder, 'css')));
  app.use('/scripts', express.static(join(__dirname, '../templates', themeFolder, 'scripts')));

  // Log static file paths for debugging
  console.log('Static paths:', {
    public: join(__dirname, '../public'),
    styles: join(__dirname, '../templates', themeFolder, 'css'),
    scripts: join(__dirname, '../templates', themeFolder, 'js'),
    theme: config.site.siteTheme
  });

  // Add security headers with helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'cdnjs.cloudflare.com'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'fonts.googleapis.com',
          'cdnjs.cloudflare.com'
        ],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "fonts.gstatic.com", "fonts.googleapis.com"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        childSrc: ["'none'"],
        workerSrc: ["'none'"],
        manifestSrc: ["'self'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
  }));

  // Add rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiting to all routes
  app.use(limiter);

  // Initialize services
  const markdownProcessor = new MarkdownProcessor(contentDir);
  const templateEngine = new TemplateEngine(config);

  // Middleware para añadir CSS común a todas las páginas
  app.use((req, res, next) => {
    templateEngine.addCssFile(`/styles/${themeFolder}/css/base.css`);
    templateEngine.addCssFile(`/styles/${themeFolder}/css/code.css`);
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
      const post = await markdownProcessor.getPost(req.params.slug);
      if (!post) {
        console.log('Post not found:', req.params.slug);
        res.status(404).send('Post not found');
        return;
      }
      
      const html = await templateEngine.renderPost(post);
      res.send(html);
    } catch (error) {
      console.error('Error rendering post:', error);
      res.status(500).send('Error rendering post');
    }
  });

  app.listen(port, () => {
    console.log(`Server running at http://${host}:${port}`);
  });

  return app;
}

initialize().catch(console.error);
