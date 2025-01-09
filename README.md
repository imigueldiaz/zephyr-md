# Zephyr MD

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A modern, lightweight static site generator focused on markdown-based blogging with exceptional syntax highlighting and accessibility.

[Demo](https://example.com) · [Documentation](https://example.com/docs) · [Report Bug](https://github.com/yourusername/zephyr-md/issues)

</div>

## ✨ Features

- 🚀 **Blazing Fast**: Built with TypeScript and optimized for performance
- 📝 **Markdown-First**: Full support for GitHub Flavored Markdown
- 🎨 **Syntax Highlighting**: Beautiful code highlighting with highlight.js
- 📱 **Responsive Design**: Looks great on all devices
- 🌗 **Dark Mode**: Automatic and manual theme switching
- ♿ **Accessibility**: WCAG 2.1 compliant
- 📋 **Code Copying**: One-click code block copying
- 🔧 **Customizable**: Easy to extend and modify

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- Yarn 1.22.0 or higher (`npm install -g yarn`)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/zephyr-md.git
cd zephyr-md
```

2. Install dependencies:
```bash
yarn
```

3. Start the development server:
```bash
yarn dev
```

Your site will be available at `http://localhost:3000`

## 📖 Usage

### Creating Posts

1. Add your markdown files to the `content/posts` directory
2. Include front matter at the top of your markdown files:

```markdown
---
title: My First Post
date: 2025-01-08
excerpt: A brief description of your post
---

Your content here...
```

### Configuration

Edit `config.json` to customize your site:

```json
{
  "site": {
    "title": "Your Site Name",
    "description": "Your site description",
    "author": {
      "name": "Your Name",
      "email": "your@email.com",
      "url": "https://yoursite.com"
    }
  }
}
```

### Building for Production

```bash
yarn build
```

The static site will be generated in the `dist` directory.

## 🎨 Customization

### Themes

Zephyr MD comes with a light and dark theme out of the box. You can customize colors in:

- `templates/css/base.css`: Global styles
- `templates/css/code.css`: Code highlighting
- `templates/css/post.css`: Post-specific styles

### Templates

Modify HTML templates in the `templates` directory:

- `base.html`: Main layout template
- `post.html`: Individual post template
- `index.html`: Home page template

## Themes

Zephyr MD comes with a powerful theming system that allows you to completely customize the look and feel of your site. The default theme provides a modern, clean design with both light and dark modes.

### Creating a New Theme

Creating a new theme from scratch can be challenging due to the complexity of the CSS and the need to handle both light and dark modes, responsive design, and various components like code blocks, tables, and navigation. The recommended approach is:

1. **Duplicate the Default Theme**
   ```bash
   cp -r templates/default templates/your-theme-name
   ```

2. **Update Configuration**
   Edit `config.json` to use your new theme:
   ```json
   {
     "site": {
       "siteTheme": "your-theme-name",
       ...
     }
   }
   ```

3. **Customize the Theme**
   The theme structure includes:
   - `base.html`: Main template with header, footer, and scripts
   - `post.html`: Template for blog posts
   - `index.html`: Template for the home page
   - `css/`
     - `base.css`: Core styles and variables
     - `code.css`: Code block styling (syntax highlighting)
     - `post.css`: Blog post specific styles
   - `scripts/`: JavaScript files for interactivity

### Theme Development Tips

- **CSS Variables**: The default theme uses CSS variables for colors, spacing, and other properties. These are defined at the root level with light/dark mode variants:
  ```css
  :root {
    --bg-color: #ffffff;
    --text-color: #1a202c;
    /* ... other variables ... */
  }

  [data-theme="dark"] {
    --bg-color: #1a202c;
    --text-color: #f7fafc;
    /* ... dark mode overrides ... */
  }
  ```

- **Code Block Styling**: Code blocks use highlight.js for syntax highlighting. The CSS is complex and carefully tuned for readability. Consider keeping the default code styling as a base.

- **Responsive Design**: The default theme includes comprehensive media queries for various screen sizes. Test your modifications across different devices.

- **Accessibility**: The default theme follows WCAG guidelines. Maintain good color contrast ratios and semantic HTML structure.

### Testing Your Theme

1. Make sure all features work in both light and dark modes
2. Test responsive layouts at different screen sizes
3. Verify code block formatting with different languages
4. Check table layouts and responsive behavior
5. Test navigation and interactive elements

### Common Pitfalls

- **Starting from Scratch**: The default theme's CSS is complex and handles many edge cases. Starting from scratch means reimplementing all this functionality.
- **Dark Mode**: Implementing a good dark mode requires careful consideration of colors, contrasts, and transitions.
- **Code Blocks**: Syntax highlighting and line numbers require specific CSS structure. Modifying these can break functionality.
- **Performance**: Complex CSS selectors and transitions can impact performance. The default theme is optimized for this.

### Recommended Workflow

1. Start by duplicating the default theme
2. Make small, incremental changes
3. Test frequently across different devices and modes
4. Use browser dev tools to understand the existing styles
5. Document your changes for future maintenance

## Docker

You can run Zephyr MD using Docker:

```bash
# Build the image
docker build -t zephyr-md .

# Run the container
docker run -d \
  -p 8585:8585 \
  -v $(pwd)/content:/app/content \
  -v $(pwd)/public:/app/public \
  --name zephyr-md \
  zephyr-md
```

The container exposes port 8585 and uses two volumes:
- `/app/content`: For your markdown files
- `/app/public`: For static files (images, css, etc)

You can customize the theme by mounting the templates directory:
```bash
docker run -d \
  -p 8585:8585 \
  -v $(pwd)/content:/app/content \
  -v $(pwd)/public:/app/public \
  -v $(pwd)/templates:/app/templates \
  --name zephyr-md \
  zephyr-md
```

## 🐳 Docker Support

### Quick Start

The easiest way to get started is using Docker. Just run:

```bash
docker run -d \
  -p 8585:3000 \
  -v ./content:/app/content \
  --name zephyr-md \
  ghcr.io/imigueldiaz/zephyr-md:latest
```

### Using Docker Compose

For a more complete setup, use Docker Compose:

1. Create a `docker-compose.yml`:

```yaml
services:
  app:
    image: ghcr.io/imigueldiaz/zephyr-md:latest
    ports:
      - "8585:3000"
    volumes:
      - ./content:/app/content
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
```

2. Start the service:

```bash
docker-compose up -d
```

### Configuration

#### Environment Variables

- `NODE_ENV`: Set the Node.js environment (default: `production`)
- `PORT`: Set the internal port (default: `3000`)

#### Volumes

- `/app/content`: Mount your markdown content directory here

### Security Features

- Non-root container user
- Signed container images with Cosign
- Regular security updates
- Vulnerability scanning with Trivy
- SBOM (Software Bill of Materials) included

### Available Tags

- `latest`: Latest stable release from main branch
- `vX.Y.Z`: Specific version releases (e.g., `v0.2.0`)

### Container Registry

The image is available on GitHub Container Registry:
- `ghcr.io/imigueldiaz/zephyr-md`

## 🛠️ Development

### Project Structure

```
zephyr-md/
├── content/          # Markdown content
├── src/              # TypeScript source
├── templates/        # HTML templates and assets
├── dist/            # Built files
└── config.json      # Site configuration
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔄 Content Management with Git

### Writing and Publishing Posts

1. Create new posts in the `content/posts` directory:
```bash
content/posts/
├── 2025-01-08-my-first-post.md
├── 2025-01-08-another-post.md
└── drafts/
    └── upcoming-post.md
```

2. Use Git for version control:
```bash
# Create a new branch for your content
git checkout -b content/new-post

# Add and commit your changes
git add content/posts/
git commit -m "Add new post about..."

# Push to your repository
git push origin content/new-post

# Merge through a pull request
```

### Remote Deployment

#### Initial Server Setup

1. Set up your Digital Ocean droplet:
   - Use SSH keys for authentication
   - Enable UFW firewall
   - Set up fail2ban
   - Configure a non-root user

2. Install dependencies:
```bash
# Update system
sudo apt update && sudo apt upgrade

# Install Node.js 18.x and yarn
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g yarn
```

3. Set up deployment keys:
```bash
# On your server
ssh-keygen -t ed25519 -C "deploy-key"
# Add the public key to your GitHub repository's deploy keys
```

#### Automated Deployment

1. Create a deployment script (`deploy.sh`):
```bash
#!/bin/bash
set -e

# Configuration
REPO_URL="git@github.com:yourusername/zephyr-md.git"
DEPLOY_DIR="/var/www/zephyr-md"
BRANCH="main"

# Update repository
if [ -d "$DEPLOY_DIR" ]; then
    cd "$DEPLOY_DIR"
    git fetch origin
    git reset --hard "origin/$BRANCH"
else
    git clone -b "$BRANCH" "$REPO_URL" "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
fi

# Install dependencies and build
yarn install
yarn build

# Restart service if needed
pm2 restart zephyr-md
```

2. Set up a systemd service:
```ini
[Unit]
Description=Zephyr MD Blog
After=network.target

[Service]
Type=simple
User=zephyr
WorkingDirectory=/var/www/zephyr-md
ExecStart=/usr/bin/yarn start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

3. Configure GitHub Actions for automated deployment:
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: SSH and deploy
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/zephyr-md
            ./deploy.sh

```

### Security Best Practices

1. **Content Security**:
   - Keep sensitive content in private repositories
   - Use `.gitignore` for excluding drafts or private content
   - Implement content validation before deployment

2. **Server Security**:
   - Use SSH key authentication only (disable password login)
   - Keep system and dependencies updated
   - Use HTTPS with Let's Encrypt
   - Implement rate limiting
   - Regular security audits

3. **Access Control**:
   - Use separate deploy keys for each environment
   - Implement role-based access in GitHub
   - Regular key rotation
   - Audit logs monitoring

4. **Backup Strategy**:
   - Regular automated backups
   - Store backups in multiple locations
   - Test backup restoration regularly

### Workflow Recommendations

1. **Content Organization**:
   - Use clear naming conventions for files
   - Organize posts by date and category
   - Keep media files in a separate directory
   - Use drafts folder for work in progress

2. **Version Control**:
   - Create feature branches for new content
   - Use meaningful commit messages
   - Review changes before merging
   - Tag important releases

3. **Deployment**:
   - Use staging environment for testing
   - Implement continuous integration
   - Automated testing before deployment
   - Easy rollback mechanism

4. **Monitoring**:
   - Set up uptime monitoring
   - Configure error logging
   - Monitor system resources
   - Set up alerts for critical issues

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [marked](https://github.com/markedjs/marked) for Markdown parsing
- [highlight.js](https://highlightjs.org/) for syntax highlighting
- [Express](https://expressjs.com/) for the development server

## 📞 Support

- Create a [GitHub Issue](https://github.com/yourusername/zephyr-md/issues) for bug reports and feature requests
- For detailed questions, use [GitHub Discussions](https://github.com/yourusername/zephyr-md/discussions)

---

<div align="center">
Made with ❤️ by [Ignacio de Miguel Diaz](https://imigueldiaz.dev)
</div>
