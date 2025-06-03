# Contributing

We welcome contributions to Mythoria. Please follow the guidelines below to make collaboration easier.

## Workflow

1. Fork the repository and create a feature branch:
   ```bash
   git checkout -b feature/my-change
   ```
2. Make your changes and run `npm run lint`.
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/):
   `feat(auth): add login page`.
4. Open a pull request against the `main` branch.

## Code style

- TypeScript strict mode is enabled; avoid `any`.
- Use functional React components.
- Tailwind CSS is the default styling method.
- Run `npm run lint` before committing.

## Tests

Add tests where possible using your preferred framework. The project currently has no automated tests but linting must pass.

Thank you for helping make Mythoria better!
