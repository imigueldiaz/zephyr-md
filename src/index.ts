import express from 'express';
import { join } from 'path';
import { TemplateEngine } from './templateEngine';
import { MarkdownProcessor } from './markdownProcessor';

export async function initialize() {
  const app = express();
  const port = 3000;

  const templateEngine = new TemplateEngine();
  const markdownProcessor = new MarkdownProcessor();

  // Serve static files from templates directory
  app.use('/css', express.static(join(__dirname, '../templates/css')));
  app.use('/scripts', express.static(join(__dirname, '../templates/scripts')));

  // Middleware para añadir CSS común a todas las páginas
  app.use((req, res, next) => {
    templateEngine.addCssFile('base.css');
    templateEngine.addCssFile('code.css');
    next();
  });

  app.get('/', async (req, res) => {
    try {
      const posts = await markdownProcessor.getAllPosts();
      const html = await templateEngine.renderIndex(posts);
      res.send(html);
    } catch (error) {
      console.error('Error rendering index:', error);
      res.status(500).send('Error rendering index');
    }
  });

  app.get('/posts/:slug', async (req, res) => {
    try {
      const post = await markdownProcessor.getPost(req.params.slug);
      if (!post) {
        res.status(404).send('Post not found');
        return;
      }
      
      templateEngine.addCssFile('post.css');
      const html = await templateEngine.renderPost(post);
      res.send(html);
    } catch (error) {
      console.error('Error rendering post:', error);
      res.status(500).send('Error rendering post');
    }
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });

  return app;
}

initialize().catch(console.error);
