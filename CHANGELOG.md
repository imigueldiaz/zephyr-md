# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- Enhanced security for environment variables management (2025-01-18)
  - Moved sensitive data from config.json to environment variables
  - Added secure JWT secret handling
  - Improved password hash storage
- Added pre-validation sanitization to prevent code injection in front matter parsing (2025-01-18)
- Added protection against template string injection attacks (2025-01-18)
- Implemented early validation middleware for file uploads (2025-01-18)
- Centralized security constants and configurations (2025-01-18)
- Enhanced content sanitization with multi-layer approach (2025-01-18)
- Added precompiled markdown configuration to prevent template injection (2025-01-18)

### Added
- Docker Security Enhancements (2025-01-18)
  - Updated Docker configuration for secure environment variables
  - Added environment variables documentation
  - Created .env.example and .env.docker.example templates
  - Added security notes for Docker deployment
- Authentication and File Upload System (2025-01-12)
  - Added authentication system with JWT tokens
  - Created login endpoint and middleware
  - Implemented secure file upload functionality
  - Added password generation script
  - Created upload controllers and middleware
- Tag pages feature (2025-01-11)
  - Added `/tags/:tag` route to display posts by tag
  - Created new tag page template
  - Added tag filtering functionality
  - Improved post previews to show tags
- Added CHANGELOG.md to track project changes

### Changed
- Updated Docker configuration (2025-01-18)
  - Moved to environment variables for sensitive data
  - Enhanced Docker documentation in README.md
  - Added Docker deployment instructions
  - Updated docker-compose.yml with environment handling
- Improved logger functionality (2025-01-11)
  - Added public methods: info, error, warn, debug
  - Better error handling in routes
- Updated documentation to reflect correct default port (8585) (2025-01-11)
- Verified minimum Node.js version requirements (2025-01-11)
  - Tested and confirmed working on Node.js 18.20.5
  - Also compatible with Node.js 22.13.0
  - Updated package.json engines field
  - Updated Yarn requirement to 1.22.22
- Updated documentation to reflect current Node.js version (22.13.0)

[Unreleased]: https://github.com/imigueldiaz/zephyr-md/compare/main...HEAD
