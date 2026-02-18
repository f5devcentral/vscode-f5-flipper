# /build-check - Pre-commit Validation

## Table of Contents

- [Description](#description)
- [Usage](#usage)
- [Steps](#steps)
- [Output Format](#output-format)

---

## Description

Run full validation before committing to ensure code quality. This skill runs compile, lint, and test commands in sequence, stopping on first failure.

---

## Usage

```
/build-check
```

No arguments required.

---

## Steps

Execute the following commands in sequence, stopping if any fail:

### 1. TypeScript Compilation

```bash
npm run compile
```

**Success criteria**: Exit code 0, no TypeScript errors

**On failure**: Report file:line for each error

### 2. ESLint Check

```bash
npm run lint
```

**Success criteria**: Exit code 0, no lint errors

**On failure**: Report file:line for each violation

### 3. Test Suite with Coverage

```bash
npm run test
```

**Success criteria**:
- All tests pass
- Coverage meets thresholds:
  - Lines: 80%
  - Functions: 80%
  - Branches: 70%

**On failure**:
- List failing tests with file:line
- Report coverage gaps if below threshold

---

## Output Format

### All Passing

```
Build Check Results
───────────────────
✅ Compile: Passed
✅ Lint: Passed
✅ Tests: Passed (XX tests)
✅ Coverage: Lines 85% | Functions 82% | Branches 74%

Ready to commit!
```

### With Failures

```
Build Check Results
───────────────────
✅ Compile: Passed
❌ Lint: 2 errors

Errors:
  src/as3/builders.ts:142 - 'foo' is defined but never used
  src/as3/mappings.ts:89 - Missing return type

Fix these issues before committing.
```

---

## Notes

- Run this before every commit
- All three checks must pass for a clean commit
- Coverage thresholds are defined in package.json nyc config
