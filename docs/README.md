# Mythoria Documentation

This directory contains all project documentation organized by category.

## Structure

- **`deployment/`** - Hosting and deployment related documentation
  - `hosting.md` - Complete hosting infrastructure setup (sensitive info)
  - `deployment-guide.md` - Step-by-step deployment instructions
  - `rollback-procedures.md` - Emergency rollback procedures

- **`development/`** - Development setup and guidelines
  - `setup.md` - Local development environment setup
  - `contributing.md` - Contribution guidelines
  - `coding-standards.md` - Code style and standards

- **`api/`** - API documentation and specifications
  - `README.md` - API overview and standards
  - `endpoints.md` - Detailed endpoint documentation

- **`architecture/`** - System architecture and design documents
  - `overview.md` - System architecture overview
  - `database-schema.md` - Database design documentation
  - `tech-stack.md` - Technology stack decisions

## Quick Start

1. **New Developer Setup**: Start with [`development/setup.md`](./development/setup.md)
2. **Deployment**: See [`deployment/deployment-guide.md`](./deployment/deployment-guide.md)
3. **API Reference**: Check [`api/README.md`](./api/README.md)

## Security Note

Some files in the `deployment/` directory contain sensitive information and are excluded from version control via `.gitignore`.
