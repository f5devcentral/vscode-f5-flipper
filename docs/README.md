# F5 Flipper 🐬

> **NetScaler to F5 Configuration Converter**

Analyze Citrix NetScaler/ADC configurations and convert them to F5 AS3 declarations with FAST templates.

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/F5DevCentral.vscode-f5-flipper?style=flat-square&label=VS%20Code%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=F5DevCentral.vscode-f5-flipper)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/F5DevCentral.vscode-f5-flipper?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=F5DevCentral.vscode-f5-flipper)

---

## What is F5 Flipper?

F5 Flipper is a Visual Studio Code extension that helps you migrate from Citrix NetScaler/ADC (and A10 Thunder ADC) to F5 technologies. It analyzes vendor configurations, abstracts applications, and generates F5 AS3 declarations ready for deployment.

### Key Capabilities

- 📦 **Parse Vendor Configs** - Import NetScaler `.conf` files, `.tgz` archives, or A10 configurations
- 🎯 **Application Abstraction** - Automatically extract CS/LB/GSLB applications with dependencies
- 📊 **Smart Diagnostics** - 40+ rules for feature detection and migration analysis
- 🔄 **AS3 Conversion** - Generate F5 AS3 declarations via FAST templates
- 🖥️ **Interactive Webviews** - Monaco editor integration with live AS3 preview
- 🌐 **Protocol Support** - HTTP, SSL, TCP, UDP, DNS, and more

---

## Quick Start

### Installation

1. Open **VS Code**
2. Go to **Extensions** (Ctrl+Shift+X)
3. Search for **"F5 Flipper"**
4. Click **Install**

Or install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=F5DevCentral.vscode-f5-flipper)

### Basic Usage

1. **Open** a folder or click the browse button in the F5 Flipper view
2. **Select** a NetScaler `.conf` or `.tgz` file (or A10 configuration)
3. **Explore** abstracted applications in the tree view
4. **Right-click** an application and select **"Generate AS3 from FAST Template"**
5. **Preview** and edit the AS3 output in the webview
6. **Deploy** to your F5 BIG-IP

![F5 Flipper Demo](https://raw.githubusercontent.com/f5devcentral/vscode-f5-flipper/main/images/flipper-2.gif)

---

## Processing Pipeline

```mermaid
flowchart LR
    A[Config File] --> B[Parse]
    B --> C[Abstract Apps]
    C --> D[Diagnostics]
    D --> E[AS3 Output]

    style A fill:#e8113f,color:#fff
    style E fill:#00a82d,color:#fff
```

1. **Unpack** - Extract configuration files from archives
2. **Parse** - Convert vendor CLI to structured JSON
3. **Abstract** - Extract application-level abstractions
4. **Diagnose** - Validate and identify migration considerations
5. **Convert** - Generate F5 AS3 declarations via FAST templates

---

## Supported Configurations

### NetScaler/ADC ✅
- Load Balancer (LB) Virtual Servers
- Content Switching (CS) Virtual Servers
- Global Server Load Balancing (GSLB)
- Service Groups and Servers
- SSL Certificates and Profiles
- Health Monitors
- Policies (Authentication, Rewrite, Responder)

### A10 Thunder ADC 🚧 (In Development)
- Virtual Servers (VIPs)
- Service Groups (Pools)
- Real Servers (Backend Members)
- Health Monitors
- SSL/HTTP Templates
- Persistence

### Output Formats
- **AS3** - F5 Application Services 3 (Current)
- **NGINX** - NGINX configuration (Future)
- **F5 XC** - F5 Distributed Cloud (Future)

---

## Technology-Specific Diagnostics

Diagnostic rules are prefixed by target F5 technology:

- `XC-` - F5 Distributed Cloud recommendations
- `TMOS-` - F5 BIG-IP best practices
- `NGINX-` - NGINX Plus guidance

Example diagnostics include:
- SSL/TLS configuration analysis
- Persistence method mapping
- Load balancing algorithm equivalents
- Security policy recommendations

---

## Documentation Sections

### 📖 Getting Started
- [Installation Guide](#installation)
- [Basic Usage](#basic-usage)
- [Understanding the Interface](getting-started/interface.md)

### ⚙️ Core Features
- [Configuration Parsing](features/parsing.md)
- [Application Abstraction](features/abstraction.md)
- [Diagnostics Engine](features/diagnostics.md)
- [AS3 Conversion](features/conversion.md)

### 🏗️ Architecture
- [Architecture Overview](a10_architecture.md)
- [NetScaler to F5 Mapping](../ROADMAP.md#netscaler-to-f5-mapping)
- [Protocol Support Matrix](../ROADMAP.md#protocolservicetype-reference)
- [A10 Configuration Reference](a10_configuration_reference.md)

### 🔧 Advanced
- [FAST Template Development](advanced/templates.md)
- [Configuration Sanitization](advanced/sanitization.md)
- [Extending Diagnostics](advanced/diagnostics-custom.md)

### 📚 Reference
- [Changelog](CHANGELOG.md)
- [Roadmap](roadmap.md)
- [API Documentation](reference/api.md)
- [Troubleshooting](reference/troubleshooting.md)

### 🤝 Contributing
- [Development Guide](contributing/development.md)
- [Testing Guidelines](contributing/testing.md)
- [Adding Vendor Support](contributing/vendor-support.md)

---

## Resources

### F5 Documentation
- [F5 AS3 Documentation](https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/latest/)
- [F5 FAST Templates](https://github.com/f5networks/f5-appsvcs-templates)
- [F5 FAST Core Library](https://github.com/f5devcentral/f5-fast-core)

### Vendor Documentation
- [NetScaler Documentation](https://docs.netscaler.com/)
- [A10 ACOS Documentation](https://documentation.a10networks.com/)

### Related Projects
- [flipper_webview](https://github.com/DumpySquare/flipper_webview) - Experimental web interface prototypes
- [vscode-f5](https://github.com/f5devcentral/vscode-f5) - F5 VS Code extension for managing BIG-IP

---

## Support & Community

- 🐛 [Report Issues](https://github.com/f5devcentral/vscode-f5-flipper/issues)
- 💬 [GitHub Discussions](https://github.com/f5devcentral/vscode-f5-flipper/discussions)
- 📖 [F5 DevCentral Community](https://community.f5.com/)
- 📧 [F5 DevCentral on GitHub](https://github.com/f5devcentral)

---

## License

[Apache License 2.0](https://github.com/f5devcentral/vscode-f5-flipper/blob/main/LICENSE)

---

**Built with ❤️ by [F5 DevCentral](https://github.com/f5devcentral)**
