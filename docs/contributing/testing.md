# Testing Guidelines

> Writing and running tests

## Test Coverage Requirements

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 70%

## Running Tests

```bash
npm run test
```

Coverage reports are in `.nyc_output/` and `out/`.

## Test Structure

Tests are in `tests/` directory with `.tests.ts` suffix:

```
tests/
├── 001_parser.tests.ts
├── 002_abstraction.tests.ts
├── 003_diagnostics.tests.ts
└── ...
```

## Writing Tests

Use Mocha and Chai:

```typescript
import { expect } from 'chai';

describe('Feature Name', () => {
    it('should do something', () => {
        const result = myFunction();
        expect(result).to.equal(expected);
    });
});
```

## Test Fixtures

Store test configs in `tests/` directory.

See [CLAUDE.md](https://github.com/f5devcentral/vscode-f5-flipper/blob/main/CLAUDE.md#testing-strategy) for more details.
