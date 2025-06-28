# Mythoria Documentation

Mythoria is a Next.js web application for interactive storytelling and character management, deployed on Google Cloud Run with Clerk authentication and PostgreSQL database.

## Quick Start

1. **Install dependencies**: `npm install`
2. **Configure environment**: Copy `.env.example` to `.env.local` and fill in values
3. **Setup database**: Run `npm run db:push` and `npm run db:seed`
4. **Start development**: `npm run dev`

## Documentation

- **[Architecture & Tech Stack](ARCHITECTURE.md)** – High-level system design and technology choices
- **[Database Schema](DATABASE.md)** – Data model and relationships
- **[Deployment Guide](DEPLOYMENT.md)** – Production deployment on Google Cloud
- **[Development Setup](DEVELOPMENT.md)** – Local development environment and tools

## Key Features

- Interactive story creation and management
- Character development tools
- AI-powered story structuring (Google Vertex AI)
- Credit-based payment system
- Multi-language support
- Google Analytics integration

*Last updated: June 2025*
