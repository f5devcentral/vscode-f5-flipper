# DEPRECATED: Old RX Parser Comparison Tests

The file `304_parseAdcArraysRx.allConfigs.int.tests.ts` has been **deprecated** and moved to:
- `304_parseAdcArraysRx.allConfigs.int.tests.ts.deprecated`

## New Location

RX Parser tests have been moved to a snapshot-based approach at:
```
tests/integration/rx-parser/
```

## Why the Change?

The old tests compared the new RX parser output against the old parser (CitrixADCold). This approach had several issues:
1. Depended on maintaining the old parser code
2. Slower execution (ran both parsers)
3. Made it harder to track intentional output changes

## New Approach

The new snapshot-based tests:
1. Compare RX parser output against golden snapshots
2. Faster execution (only runs RX parser)
3. Clear regression detection
4. Version control friendly
5. No dependency on old code

See `tests/integration/rx-parser/README.md` for details.

## Old File

The old file is preserved as `.deprecated` for reference but is not run as part of the test suite.
