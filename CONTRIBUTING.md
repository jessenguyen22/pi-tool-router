# Contributing to pi-tool-router

Thank you for your interest in contributing!

## Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/pi-tool-router.git
   cd pi-tool-router
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a development branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/router.test.ts
```

### Running in Dev Mode

```bash
npm run dev
```

### Type Checking

```bash
npm run build
```

### Linting

```bash
npm run lint
npm run format  # Auto-fix formatting
```

## Code Style

- Use TypeScript for all code
- Follow the existing code style
- Run `npm run format` before committing
- Add unit tests for new features

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new routing strategy
fix: resolve issue with tool selection
docs: update README
test: add tests for matcher
refactor: improve routing logic
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Update the CHANGELOG.md
5. Submit a pull request with a clear description

## Project Structure

```
pi-tool-router/
├── src/
│   ├── core/          # Core routing logic
│   │   ├── types.ts   # Type definitions
│   │   ├── router.ts  # Main router
│   │   ├── matcher.ts # Rule matching
│   │   └── executor.ts# Tool execution
│   ├── config/        # Configuration management
│   ├── tools/          # Tools registry
│   └── observability/  # Analytics & dashboard
├── tests/             # Test files
├── docs/              # Documentation
└── extension.ts       # Main extension entry
```

## Reporting Issues

Please include:
- pi-tool-router version
- Node.js version
- pi coding agent version
- Steps to reproduce
- Expected vs actual behavior

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
