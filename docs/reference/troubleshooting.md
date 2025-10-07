# Troubleshooting

> Common issues and solutions

## Installation Issues

### Extension Not Appearing

1. Restart VS Code
2. Check VS Code version (1.75.0+ required)
3. Check Extensions view for errors

## Parsing Issues

### Config Not Loading

1. Verify file format (.conf or .tgz)
2. Check for syntax errors in config
3. View Output panel (F5 Flipper) for errors

### Incomplete Applications

Some applications may not be fully abstracted if:
- Configuration has unsupported features
- References are broken
- Objects are incomplete

Check diagnostics for warnings.

## AS3 Generation Issues

### Template Not Found

Ensure FAST templates exist in `templates/as3/` folder.

### Invalid AS3 Output

1. Check parameter values in webview
2. Verify template compatibility
3. Review AS3 schema documentation

## Getting Help

- [GitHub Issues](https://github.com/f5devcentral/vscode-f5-flipper/issues)
- [GitHub Discussions](https://github.com/f5devcentral/vscode-f5-flipper/discussions)
- [F5 DevCentral](https://community.f5.com/)
