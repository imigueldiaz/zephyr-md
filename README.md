# Zephyr MD

<div align="center">

<p align="center">
  <img src="public/images/zephir-md.jpg" alt="Zephyr MD" width="100%">
</p>

[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![GitHub tag (latest by date)](https://img.shields.io/github/v/tag/imigueldiaz/zephyr-md?style=flat)](https://github.com/imigueldiaz/zephyr-md/tags)
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
- 🔒 **Security**: JWT authentication and secure file uploads
- 🛡️ **Helmet Integration**: Comprehensive security headers
- 🚦 **Rate Limiting**: Protection against abuse (100 requests per 15 minutes)
- 👤 **Non-root Docker User**: Enhanced container security
- 🔐 **CSP Headers**: Strict Content Security Policy
- 🍪 **Secure Cookies**: HTTP-only, Secure, and SameSite cookie configuration

## 🚀 Quick Start

### Prerequisites

- Node.js 18.20.5 or higher (tested versions: 18.20.5, 22.13.0)
- Yarn 1.22.22 or higher

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

Your site will be available at `http://localhost:8585`

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

## 🔒 Security Features

- **JWT Authentication**: Secure authentication using JSON Web Tokens
- **CSRF Protection**: Built-in protection against Cross-Site Request Forgery attacks using cryptographically secure tokens and double-submit cookie pattern
- **Helmet Integration**: Comprehensive security headers
- **Rate Limiting**: Protection against abuse (100 requests per 15 minutes)
- **Non-root Docker User**: Enhanced container security
- **CSP Headers**: Strict Content Security Policy
- **Secure Cookies**: HTTP-only, Secure, and SameSite cookie configuration
- **Input Validation**: Strict validation and sanitization of all user inputs
- **File Upload Security**: Secure file upload handling with type and size restrictions

## 🔒 Authentication and Admin Features

Zephyr MD includes a secure admin interface for managing content:

1. Access the login page at `/login`
2. After authentication, you can:
   - Upload new markdown posts through the web interface at `/upload`
   - Access protected admin features
   - Manage your content securely

### 🐳 Docker Deployment

#### Using Docker Run

```bash
docker run -d \
  -p 8585:8585 \
  -e JWT_SECRET=your_jwt_secret \
  -e ADMIN_PASSWORD_HASH=your_bcrypt_hash \
  -e ADMIN_USERNAME=admin \
  -e NODE_ENV=production \
  -e COOKIE_DOMAIN=localhost \
  -e JWT_EXPIRY=86400000 \
  -v $(pwd)/content:/app/content \
  -v $(pwd)/public:/app/public \
  -v $(pwd)/templates:/app/templates \
  ghcr.io/imigueldiaz/zephyr-md:latest
```

#### Using Docker Compose

1. Create a `.env` file:
```bash
# Authentication
JWT_SECRET=your_jwt_secret
ADMIN_PASSWORD_HASH=your_bcrypt_hash
ADMIN_USERNAME=admin

# Node Environment
NODE_ENV=production
PORT=8585
COOKIE_DOMAIN=localhost
JWT_EXPIRY=86400000
```

2. Run with docker-compose:
```bash
docker-compose up -d
```

#### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT token generation (required) | - |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash of admin password (required) | - |
| `ADMIN_USERNAME` | Admin username | admin |
| `PORT` | Server port | 8585 |
| `NODE_ENV` | Node environment | production |
| `COOKIE_DOMAIN` | Cookie domain restriction | localhost |
| `JWT_EXPIRY` | JWT token expiration time (ms) | 86400000 |

#### Generating Secure Credentials

1. Generate a secure JWT secret:
```bash
openssl rand -hex 64
```

2. Generate a bcrypt hash for your password:
```bash
# Using Node.js
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your_password', 10).then(console.log)"
```

#### Security Notes

- Never store plain text passwords
- Keep your `.env` file secure and never commit it to version control
- Use strong passwords and a secure JWT secret
- The admin interface is rate-limited to prevent brute force attacks
- All uploads are validated and sanitized
- The application runs as a non-root user in Docker for enhanced security

### 📝 Creating Posts via Upload

1. Log in to the admin interface at `/login`
2. Navigate to `/upload`
3. Select your markdown file
4. The file will be automatically:
   - Validated for proper markdown format
   - Checked for required front matter
   - Sanitized for security
   - Added to your content directory
   - Available immediately on your site

#### Markdown Front Matter Requirements

```markdown
---
title: Your Post Title
date: YYYY-MM-DD
excerpt: A brief description
---

Your content here...
```

## 🔧 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# JWT Configuration
JWT_SECRET=your_jwt_secret_here

# Admin User Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=your_bcrypt_hash_here

# Node Environment
NODE_ENV=development
PORT=8585

# Cookie Settings
COOKIE_DOMAIN=localhost
JWT_EXPIRY=86400000  # 24 hours in milliseconds
```

For Docker deployment, you can use the provided `.env.docker.example` as a template.

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

## 🔒 Security Features

### Cookie Security
- **HTTP-Only**: Prevents client-side access to sensitive cookies
- **Secure Flag**: Ensures cookies are only sent over HTTPS in production
- **SameSite**: Protection against CSRF attacks
- **Domain Restriction**: Limits cookie scope to specific domains
- **Configurable Expiration**: Control over session duration

### Authentication
- JWT-based authentication with secure storage in HTTP-only cookies
- Rate limiting to prevent brute force attacks
- Secure password hashing with bcrypt
- Environment-based security configuration

### Content Security
- **Helmet Integration**: Comprehensive security headers
- **CSP Headers**: Strict Content Security Policy
- **Rate Limiting**: Protection against abuse (100 requests per 15 minutes)

## 🐳 Docker

You can run Zephyr MD using Docker:

```bash
# Build the image
docker build -t zephyr-md .

# Run the container
docker run -d \
  -p 8585:8585 \
  -v $(pwd)/content:/app/content \
  -v $(pwd)/public:/app/public \
  -e JWT_SECRET=your_jwt_secret_here \
  -e ADMIN_PASSWORD_HASH=your_password_hash_here \
  -e ADMIN_USERNAME=admin \
  -e NODE_ENV=production \
  -e COOKIE_DOMAIN=localhost \
  -e JWT_EXPIRY=86400000 \
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
  -e JWT_SECRET=your_jwt_secret_here \
  -e ADMIN_PASSWORD_HASH=your_password_hash_here \
  -e ADMIN_USERNAME=admin \
  -e NODE_ENV=production \
  -e COOKIE_DOMAIN=localhost \
  -e JWT_EXPIRY=86400000 \
  --name zephyr-md \
  zephyr-md
```

Alternatively, you can use an environment file:
```bash
docker run -d \
  -p 8585:8585 \
  -v $(pwd)/content:/app/content \
  -v $(pwd)/public:/app/public \
  -v $(pwd)/templates:/app/templates \
  --env-file .env \
  --name zephyr-md \
  zephyr-md
```

## 🐳 Docker Support

### Quick Start

The easiest way to get started is using Docker. Just run:

```bash
docker run -d \
  -p 8585:8585 \
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
      - "8585:8585"
    volumes:
      - ./content:/app/content
      - ./public:/app/public
      - ./templates:/app/templates
    environment:
      - NODE_ENV=production
      - PORT=8585
    restart: unless-stopped
```

2. Start the service:

```bash
docker-compose up -d
```

### Environment Variables

- `PORT`: Server port (default: 8585)
- `HOST`: Server host (default: localhost)
- `NODE_ENV`: Environment mode (development/production)
- `COOKIE_DOMAIN`: Cookie domain restriction (default: localhost)
- `JWT_EXPIRY`: JWT token expiration time (ms) (default: 86400000)

### Volumes

- `/app/content`: Blog posts and content
- `/app/public`: Static files (images, etc.)
- `/app/templates`: Theme templates

## 🔧 Advanced Configuration

### Security Settings

The application uses Helmet for security headers. Default CSP configuration:

```javascript
{
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
  styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdnjs.cloudflare.com'],
  imgSrc: ["'self'", "data:", "https:"],
  fontSrc: ["'self'", "fonts.gstatic.com", "fonts.googleapis.com"]
}
```

### Rate Limiting

Default rate limit configuration:
- Window: 15 minutes
- Max Requests: 100 per IP
- Standard Headers: Enabled
- Legacy Headers: Disabled

### Logging

- Automatic log directory creation at `logs/`
- Structured logging with timestamp and log levels
- Production-ready logging configuration

## 🏗️ Project Structure

```
zephyr-md/
├── content/          # Blog posts and content
│   └── posts/        # Markdown files
├── public/           # Static assets
├── src/             # TypeScript source
├── templates/        # Theme templates
│   └── default/     # Default theme
│       ├── css/     # Stylesheets
│       ├── scripts/ # JavaScript
│       └── *.html   # Template files
└── config.json      # Site configuration
```

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
