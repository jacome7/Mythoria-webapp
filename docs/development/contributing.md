# Contributing to Mythoria

Thank you for contributing to Mythoria! This guide covers everything you need to know.

## Quick Start

1. **Fork and clone** the repository
2. **Set up** development environment (see [setup.md](./setup.md))
3. **Create** feature branch: `git checkout -b feature/your-feature`
4. **Make** your changes
5. **Test** locally: `npm run test && npm run build`
6. **Submit** pull request

## Development Workflow

### Branch Naming
- **Features**: `feature/add-story-comments`
- **Bug fixes**: `fix/authentication-error`
- **Documentation**: `docs/update-api-guide`
- **Refactoring**: `refactor/story-service`

### Commit Guidelines

Use conventional commit format:
```
type(scope): description

Examples:
feat(auth): add social login support
fix(api): resolve story creation bug
docs(readme): update setup instructions
style(components): fix linting issues
refactor(db): optimize story queries
test(auth): add login flow tests
```

### Code Standards

#### TypeScript
- **Strict mode**: Always enabled
- **Type safety**: No `any` types
- **Interfaces**: Prefer over type aliases
- **Enums**: Use for constants

#### React/Next.js
- **Functional components**: Prefer over class components
- **Hooks**: Use built-in hooks appropriately
- **Server components**: Use when possible (App Router)
- **Error boundaries**: Implement for user-facing errors

#### Styling
- **Tailwind CSS**: Primary styling framework
- **DaisyUI**: For component consistency
- **Responsive**: Mobile-first approach
- **Accessibility**: Follow WCAG guidelines

#### Database
- **Drizzle ORM**: Use typed queries
- **Migrations**: Always generate for schema changes
- **Indexing**: Consider performance implications
- **Transactions**: Use for multi-step operations

### Testing

#### Required Tests
- **Unit tests**: All utility functions
- **Component tests**: React components
- **API tests**: All endpoints
- **Integration tests**: Critical user flows

#### Testing Standards
```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test auth.test.ts

# Run in watch mode
npm run test:watch
```

### Pull Request Process

#### Before Submitting
- [ ] All tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated if needed
- [ ] No console.log statements left
- [ ] TypeScript compiles without errors

#### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Edge cases considered

## Screenshots (if applicable)
Add screenshots for UI changes
```

#### Review Process
1. **Automated checks** must pass
2. **Code review** by maintainer
3. **Testing** in staging environment
4. **Approval** and merge

## Code of Conduct

### Our Standards
- Use welcoming and inclusive language
- Be respectful of different viewpoints
- Accept constructive feedback gracefully
- Focus on what's best for the community
- Show empathy towards other contributors

### Unacceptable Behavior
- Harassment or discriminatory language
- Personal attacks or trolling
- Public or private harassment
- Publishing others' private information
- Other unprofessional conduct

## Getting Help

### Resources
- **Setup Issues**: See [setup.md](./setup.md)
- **API Questions**: Check [API docs](../api/README.md)
- **Architecture**: Review [architecture overview](../architecture/overview.md)

### Support Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Pull Request Comments**: Code-specific discussions

### Maintainer Response Times
- **Bug reports**: 2-3 business days
- **Feature requests**: 1 week
- **Pull requests**: 3-5 business days
- **Security issues**: 24 hours

## Development Tips

### Performance
- Use React.memo() for expensive components
- Implement proper loading states
- Optimize database queries
- Use Next.js Image component for images

### Security
- Validate all inputs on server side
- Use environment variables for secrets
- Implement proper authentication checks
- Follow OWASP security guidelines

### Accessibility
- Use semantic HTML elements
- Provide alt text for images
- Ensure keyboard navigation works
- Test with screen readers

---

Thank you for contributing to Mythoria! 🎭

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Verify setup**
   - Open http://localhost:3000
   - Check health endpoint: http://localhost:3000/api/health

## Development Workflow

### Branch Naming Convention

Use descriptive branch names with the following prefixes:

- `feature/` - New features
- `bugfix/` - Bug fixes
- `hotfix/` - Critical fixes for production
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests

**Examples:**
```bash
feature/user-authentication
bugfix/story-creation-validation
docs/api-documentation-update
refactor/database-connection-pool
```

### Development Process

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code following our coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm run lint          # Check code style
   npm run test          # Run tests
   npm run build         # Ensure build works
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add user authentication system"
   ```

5. **Push and create pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

**Example:**
```typescript
/**
 * Creates a new story in the database
 * @param story - Story data to create
 * @param authorId - ID of the story author
 * @returns Promise resolving to created story
 */
export async function createStory(
  story: CreateStoryInput,
  authorId: string
): Promise<Story> {
  // Implementation
}
```

### React Components

- Use functional components with hooks
- Follow component naming convention (PascalCase)
- Extract reusable logic into custom hooks
- Use TypeScript interfaces for props

**Example:**
```typescript
interface StoryCardProps {
  story: Story;
  onEdit?: (story: Story) => void;
  onDelete?: (storyId: string) => void;
}

export function StoryCard({ story, onEdit, onDelete }: StoryCardProps) {
  // Component implementation
}
```

### CSS/Styling

- Use Tailwind CSS for styling
- Follow mobile-first responsive design
- Use semantic class names
- Keep components self-contained

### Database

- Use Drizzle ORM for database operations
- Write migrations for schema changes
- Follow naming conventions (snake_case for columns)
- Add appropriate indexes

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

### Examples

```bash
feat(auth): add Google OAuth integration
fix(api): resolve story creation validation error
docs(readme): update installation instructions
refactor(db): optimize story query performance
test(api): add unit tests for user endpoints
```

## Pull Request Process

### Before Submitting

- [ ] Code follows project coding standards
- [ ] Tests pass locally (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated (if applicable)
- [ ] Self-review completed

### Pull Request Template

When creating a PR, include:

**Description**
- Brief description of changes
- Link to related issue (if applicable)

**Type of Change**
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

**Testing**
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

**Screenshots** (if UI changes)
- Before/after screenshots

### Review Process

1. **Automated checks** - CI/CD pipeline runs
2. **Code review** - At least one maintainer reviews
3. **Testing** - Reviewer tests functionality
4. **Approval** - Changes approved by maintainer
5. **Merge** - PR merged into main branch

### Addressing Review Comments

- Address all review comments
- Use `git commit --amend` for small fixes
- Push updates to the same branch
- Request re-review when ready

## Issue Reporting

### Bug Reports

When reporting bugs, include:

**Environment**
- Operating system and version
- Browser and version (if applicable)
- Node.js version
- npm/yarn version

**Steps to Reproduce**
1. Step one
2. Step two
3. Step three

**Expected Behavior**
What you expected to happen

**Actual Behavior**
What actually happened

**Additional Context**
- Screenshots
- Error messages
- Console logs

### Feature Requests

When requesting features, include:

**Problem Statement**
Clear description of the problem

**Proposed Solution**
Detailed description of proposed feature

**Alternatives Considered**
Other solutions you've considered

**Additional Context**
Mockups, examples, or references

## Project Structure

```
mythoria-webapp/
├── docs/              # Documentation
├── src/               # Source code
│   ├── app/          # Next.js pages and API routes
│   ├── components/   # React components
│   └── db/           # Database layer
├── scripts/          # Utility scripts
├── config/           # Configuration files
├── tests/            # Test files
└── tools/            # Development tools
```

## Testing Guidelines

### Unit Tests

- Write tests for all business logic
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies

### Integration Tests

- Test API endpoints
- Test database operations
- Test component integration

### E2E Tests

- Test critical user journeys
- Test cross-browser compatibility
- Test responsive design

## Documentation

### Code Documentation

- Document all public APIs
- Add inline comments for complex logic
- Update README files when adding features

### API Documentation

- Document all API endpoints
- Include request/response examples
- Update OpenAPI specifications

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR.MINOR.PATCH**
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Version number incremented
- [ ] Release notes prepared
- [ ] Deployment tested in staging

## Getting Help

### Resources

- [Development Setup Guide](./setup.md)
- [API Documentation](../api/README.md)
- [Architecture Overview](../architecture/overview.md)
- [Deployment Guide](../deployment/deployment-guide.md)

### Support Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and discussions
- **Email** - rodrigovieirajacome@gmail.com (for sensitive issues)

## Recognition

Contributors will be recognized in:

- GitHub contributors page
- Release notes
- Project documentation

Thank you for contributing to Mythoria! 🚀
