# F5 Flipper 🐬

**NetScaler to F5 Configuration Converter**

Analyze Citrix NetScaler/ADC configurations and convert them to F5 AS3 declarations with FAST templates.

**📖 [Documentation](https://f5devcentral.github.io/vscode-f5-flipper/)**

![Project Flipper](project-flipper-dophin.png)

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/F5DevCentral.vscode-f5-flipper?style=flat-square&label=VS%20Code%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=F5DevCentral.vscode-f5-flipper)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/F5DevCentral.vscode-f5-flipper?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=F5DevCentral.vscode-f5-flipper)

---

## ✨ Key Features

- 📦 **Parse NetScaler Configs** - Import `.conf` files or `.tgz` archives
- 🎯 **Application Abstraction** - Automatically extract CS/LB/GSLB applications
- 📊 **Smart Diagnostics** - 40+ rules for feature detection and analysis
- 🔄 **AS3 Conversion** - Generate F5 AS3 declarations via FAST templates
- 🖥️ **Interactive Webviews** - Monaco editor integration with live AS3 preview
- 🌐 **Protocol Support** - HTTP, SSL, TCP, UDP, DNS, and more

---

## 🚀 Quick Start

1. **Install** the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=F5DevCentral.vscode-f5-flipper)
2. **Open** a folder or click the browse button to select a NetScaler `.conf` or `.tgz` file
3. **Explore** abstracted applications in the F5 Flipper view
4. **Convert** applications to AS3 using FAST templates

<img src="./images/flipper-2.gif" alt="F5 Flipper Demo" width="100%"/>

---

## 🎯 What It Does

F5 Flipper helps you migrate from Citrix NetScaler/ADC to F5 technologies by:

1. **Parsing** NetScaler configuration files into structured JSON
2. **Abstracting** applications with all their dependencies (monitors, pools, certificates, policies)
3. **Analyzing** configurations with diagnostic rules for feature detection
4. **Converting** to F5 AS3 declarations ready for deployment on BIG-IP

### Technology-Specific Diagnostics

Diagnostic rules are prefixed by target F5 technology:
- `XC-` - F5 Distributed Cloud
- `TMOS-` - F5 BIG-IP
- `NGINX-` - NGINX Plus

---

## 📝 Output Formats

- **AS3 Declarations** - Declarative JSON for F5 BIG-IP deployment
- **JSON Reports** - Complete configuration analysis and statistics
- **YAML Reports** - Human-readable application summaries
- **Application Views** - Interactive tree view with Monaco editors

---

## 🤝 Contributing

We welcome contributions! Whether you're interested in:

- 📖 Improving documentation
- 🔍 Tuning diagnostic rules
- 💻 Adding features or fixing bugs
- 🗺️ Mapping NetScaler features to F5 equivalents
- 🎨 Enhancing FAST templates

Check out the [GitHub Issues](https://github.com/f5devcentral/vscode-f5-flipper/issues) to see what's in progress or open a new issue to report bugs and request features.

---

## 📚 Documentation

- **[Documentation Site](https://f5devcentral.github.io/vscode-f5-flipper/)** - Full documentation with guides and examples
- [ROADMAP.md](ROADMAP.md) - Project roadmap and technical architecture
- [CHANGELOG.md](CHANGELOG.md) - Version history and release notes
- [CLAUDE.md](CLAUDE.md) - Development guidelines for contributors

---

## 💡 Recommended Extension

For enhanced NetScaler syntax highlighting, install [NetScaler by Tim Denholm](https://marketplace.visualstudio.com/items?itemName=timdenholm.netscaler) - works great alongside F5 Flipper!

---

## 🙏 Acknowledgments

Special thanks to:
- **Tim Denholm** for the excellent NetScaler VS Code extension
- **F5 FAST Core** team for the template processing framework
- The open source community for feedback and contributions

---

## 📄 License

[Apache License 2.0](LICENSE)

---

## 🔗 Resources

- [F5 Application Services 3 (AS3)](https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/latest/)
- [F5 FAST Templates](https://github.com/f5networks/f5-appsvcs-templates)
- [NetScaler Documentation](https://docs.netscaler.com/)

---

**Built with ❤️ by F5 DevCentral**
