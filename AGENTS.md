# Mythoria Web App – Agent Guide

## Dev environment tips
- Node.js 22+ and npm are required.
- Install dependencies with `npm install`.
- Create a `.env.local` file with the required secrets (see `README.md`).
- Apply database migrations using `npm run db:push`.
- Start the development server with `npm run dev`.

## Testing instructions
- Lint: `npm run lint`
- Type check: `npm run typecheck`
- Unit tests: `npm test`

## PR instructions
- Use conventional commit messages.
- Run lint, typecheck, and tests before committing.
- Format code when needed with `npm run format:fix`.

## Coding style
- 2 spaces for indentation, single quotes, semicolons, and trailing commas.
- Place external imports before internal `@/` imports.
- Prefer arrow functions for callbacks and `async/await` for asynchronous code.
- Export shared types from `src/types`.
