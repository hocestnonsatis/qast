# Contributing to QAST

First off, thank you for considering contributing to QAST! 🎉

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include screenshots and animated GIFs if applicable**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and explain which behavior you expected to see instead**
- **Explain why this enhancement would be useful**

### Pull Requests

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for your changes
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add some amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

#### Code Style

- Use TypeScript for all code
- Follow the existing code style
- Run `npm test` before submitting
- Ensure type safety (no `any` unless necessary)
- Add JSDoc comments for public APIs

#### Testing

- Write tests for new features
- Ensure all existing tests pass
- Aim for high code coverage
- Test edge cases and error conditions

### Development Setup

```bash
# Clone the repository
git clone https://github.com/hocestnonsatis/qast.git
cd qast

# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build
```

### Project Structure

```
qast/
├── src/              # Source code
│   ├── parser/       # Tokenizer, parser, validator
│   ├── adapters/     # ORM adapters (Prisma, TypeORM, Sequelize)
│   ├── types/        # TypeScript type definitions
│   └── errors.ts     # Custom error classes
├── tests/            # Test files
├── examples/         # Example projects
└── dist/             # Compiled output (generated)
```

### Making Changes

1. **Parser/Tokenizer**: If you're modifying the parser or tokenizer, make sure to update tests accordingly
2. **Adapters**: When adding or modifying adapters, ensure compatibility with the target ORM
3. **Types**: Keep type definitions accurate and complete
4. **Documentation**: Update README.md if you're adding new features

### Commit Messages

- Use clear, descriptive commit messages
- Reference issue numbers if applicable
- Use present tense ("Add feature" not "Added feature")

### Questions?

Feel free to open an issue for any questions you might have about contributing.

Thank you for contributing to QAST! 🙏

