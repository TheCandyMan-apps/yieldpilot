# Contributing to YieldPilot

Thank you for your interest in contributing to YieldPilot! This document outlines the process and conventions for contributing.

## Development Setup

1. **Prerequisites**
   - Node.js 22.x or higher
   - npm (comes with Node.js)

2. **Installation**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   npm install
   ```

3. **Development Server**
   ```bash
   npm run dev
   ```

## Branch Conventions

### Branch Naming
Use descriptive branch names with the following prefixes:

- `feature/` - New features or enhancements
  - Example: `feature/add-roi-calculator`
- `fix/` - Bug fixes
  - Example: `fix/calculation-rounding-error`
- `refactor/` - Code refactoring without changing functionality
  - Example: `refactor/simplify-deal-scoring`
- `docs/` - Documentation updates
  - Example: `docs/update-api-readme`
- `chore/` - Maintenance tasks, dependency updates
  - Example: `chore/upgrade-react`

### Branch Workflow
1. Create a new branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes with clear, atomic commits

3. Push your branch and open a Pull Request
   ```bash
   git push origin feature/your-feature-name
   ```

## Pull Request Guidelines

### Before Submitting
Ensure your code passes all checks:
```bash
npm ci                    # Clean install dependencies
npx tsc --noEmit         # Type checking
npx eslint .             # Linting
npm run build            # Build verification
```

### PR Description
Your PR should include:
- **Summary**: Brief description of changes
- **Motivation**: Why these changes are needed
- **Testing**: How you verified the changes work
- **Screenshots**: For UI changes (before/after)

### PR Title Format
Use conventional commit format:
- `feat: add new feature`
- `fix: resolve bug in component`
- `refactor: simplify logic`
- `docs: update README`
- `chore: update dependencies`

### Review Process
1. All PRs require CI checks to pass (build, typecheck, lint)
2. Code review from at least one maintainer
3. Address review feedback with new commits
4. Maintainers will merge once approved

## Code Style

### TypeScript
- Use TypeScript for all new code
- Avoid `any` types when possible
- Define proper interfaces and types

### React Components
- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks

### Styling
- Use Tailwind CSS semantic tokens from design system
- Follow existing patterns in `src/index.css`
- Avoid inline styles or direct color values

### File Organization
- Place components in `src/components/`
- Place pages in `src/pages/`
- Place utilities in `src/lib/`
- Keep files focused and modular

## Testing

While we don't currently have automated tests, please manually verify:
- Your changes work as expected
- No regressions in existing functionality
- Responsive design (mobile, tablet, desktop)
- Dark/light mode compatibility (if applicable)

## Getting Help

- Check existing issues and PRs
- Open an issue for bugs or feature requests
- Ask questions in PR comments

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
