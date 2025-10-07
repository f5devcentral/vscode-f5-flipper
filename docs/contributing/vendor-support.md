# Adding Vendor Support

> Extending F5 Flipper to support additional ADC vendors

## Overview

F5 Flipper's architecture supports multiple ADC vendors. Currently supported:
- ✅ Citrix NetScaler/ADC (complete)
- 🚧 A10 Thunder ADC (in development)
- 🚧 VMware Avi (in development)

## Architecture for Multi-Vendor Support

### 1. Vendor Detection

Implement vendor detection based on config syntax patterns.

### 2. Parser Implementation

Create vendor-specific parser following the existing pattern:
- RegExTree for config line patterns
- JSON tree builder
- Object indexing

### 3. Digesters

Implement digesters for application abstraction:
- Virtual server digester
- Pool/service digester
- Monitor digester
- Policy digester

### 4. Diagnostics

Add vendor-specific diagnostic rules.

### 5. Conversion Templates

Create FAST templates for vendor → AS3 conversion.

## Example: A10 Support

See documentation for A10 implementation:
- [A10 Architecture](../a10_architecture.md)
- [A10 Configuration Reference](../a10_configuration_reference.md)

## Getting Started

1. Study existing NetScaler implementation
2. Review vendor configuration syntax
3. Map vendor objects to F5 equivalents
4. Implement parser and digesters
5. Add comprehensive tests
6. Document configuration mappings

## Resources

- [Architecture Overview](../a10_architecture.md)
- [NetScaler Mapping](../roadmap.md#netscaler-to-f5-mapping)
- [Development Guide](development.md)
