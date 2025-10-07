# Development Guide

> Setting up your development environment

## Prerequisites

- Node.js 14+ and npm
- VS Code
- Git

## Setup

1. Clone the repository:
```bash
git clone https://github.com/f5devcentral/vscode-f5-flipper.git
cd vscode-f5-flipper
```

2. Install dependencies:
```bash
npm install
```

3. Open in VS Code:
```bash
code .
```

## Development Commands

- `npm run compile` - Compile TypeScript
- `npm run watch` - Watch mode compilation
- `npm run lint` - Run linter
- `npm run test` - Run tests with coverage
- `npm run build-package` - Build .vsix package

## Running the Extension

1. Press **F5** in VS Code
2. A new Extension Development Host window opens
3. Test your changes

## Project Structure

See [CLAUDE.md](https://github.com/f5devcentral/vscode-f5-flipper/blob/main/CLAUDE.md) for detailed architecture.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

See [GitHub Issues](https://github.com/f5devcentral/vscode-f5-flipper/issues) for current work.
