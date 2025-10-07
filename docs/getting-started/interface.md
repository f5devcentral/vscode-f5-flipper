# Understanding the Interface

## F5 Flipper View

The main F5 Flipper interface is located in the Activity Bar (left sidebar).

### Main Components

```
┌─────────────────────────────────┐
│ F5 FLIPPER 🐬                   │
├─────────────────────────────────┤
│ 📁 Browse for Config            │
│ 🔄 Refresh                       │
├─────────────────────────────────┤
│ 📊 Reports                       │
│   ├─ Full YAML Report           │
│   ├─ Full JSON Report           │
│   └─ NS Config as JSON          │
├─────────────────────────────────┤
│ 🌐 Applications                  │
│   ├─ CS Virtual Servers         │
│   ├─ LB Virtual Servers         │
│   └─ GSLB Virtual Servers       │
├─────────────────────────────────┤
│ 🔍 Diagnostics                   │
│   ├─ Errors (Red)               │
│   ├─ Warnings (Orange)          │
│   └─ Information (Green)        │
├─────────────────────────────────┤
│ 📝 FAST Templates                │
│   ├─ HTTP Template              │
│   ├─ HTTPS Template             │
│   ├─ TCP Template               │
│   └─ UDP Template               │
└─────────────────────────────────┘
```

## Tree View Sections

### 1. Reports Section

Contains high-level reports and configuration views:

- **Full YAML Report** - Human-readable summary of all applications
- **Full JSON Report** - Complete JSON structure of parsed config
- **NS Config as JSON** - Original config converted to JSON format

**Hover Tips**: Hover over the Reports section to see configuration statistics.

### 2. Applications Section

Lists all abstracted applications grouped by type:

#### Content Switching (CS) Virtual Servers
- Entry point for content-based routing
- Contains policies and actions
- References backend LB virtual servers

#### Load Balancing (LB) Virtual Servers
- Direct load balancing endpoints
- Contains pools and monitors
- SSL certificates and profiles

#### GSLB Virtual Servers
- Global server load balancing
- Site and service references
- Geographic distribution

**Application Icons**:
- 🌐 - HTTP/Web applications
- 🔒 - SSL/HTTPS applications
- 🔧 - TCP applications
- 📡 - UDP applications

### 3. Diagnostics Section

Shows analysis results with severity levels:

- 🔴 **Error** - Critical issues requiring attention
- 🟠 **Warning** - Potential problems or unsupported features
- 🟢 **Information** - Recommendations and best practices

**Diagnostic Prefixes**:
- `XC-` - F5 Distributed Cloud specific
- `TMOS-` - F5 BIG-IP specific
- `NGINX-` - NGINX Plus specific

### 4. FAST Templates Section

Available AS3 conversion templates:

- Protocol-specific templates (HTTP, HTTPS, TCP, UDP, DNS)
- Custom templates from `templates/as3/` folder
- Template preview and editing capabilities

## Context Menus

Right-click on items for additional actions:

### Application Context Menu
- **View NS App Lines** - Show original NetScaler config
- **View NS App JSON** - Show abstracted JSON
- **Generate AS3 from FAST Template** - Convert to AS3

### Template Context Menu
- **View Template** - Inspect template source
- **Edit Template** - Modify template (advanced)

## Webview Interface

When generating AS3, an interactive webview opens:

### Webview Sections

```
┌──────────────────────────────────────┐
│ Template: HTTPS Virtual Server       │
├──────────────────────────────────────┤
│ [Schema] [Start Values] [Parameters] │
│                                      │
│ Monaco Editor (JSON)                 │
│                                      │
├──────────────────────────────────────┤
│ [Render AS3] [Open in Editor]       │
├──────────────────────────────────────┤
│ AS3 Preview                          │
│                                      │
│ Monaco Editor (AS3 JSON)             │
└──────────────────────────────────────┘
```

#### Schema Tab
- Template parameter definitions
- Data types and validation rules
- Read-only reference

#### Start Values Tab
- Default values extracted from NetScaler app
- Starting point for parameter editing
- Read-only reference

#### Parameters Tab
- Editable JSON parameters
- Modify to customize AS3 output
- Real-time validation

#### AS3 Preview
- Live preview of generated AS3
- Updates when "Render AS3" is clicked
- Can be opened in new editor tab

## Status Bar

The VS Code status bar shows:

- **F5 Flipper Status** - Current operation status
- **Parse Progress** - During configuration parsing
- **Error Count** - If parsing encounters issues

## Command Palette

Access F5 Flipper commands via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- `F5 Flipper: Browse for Config`
- `F5 Flipper: Clear Config`
- `F5 Flipper: Refresh View`
- `F5 Flipper: Export Report`

## Visual Indicators

### Tree View Badges
- Numbers indicate item counts (e.g., `Applications (24)`)

### Color Coding
- 🔴 Red - Errors
- 🟠 Orange - Warnings
- 🟢 Green - Success/Information
- 🔵 Blue - Informational notes

### Icons
- 📦 - Configuration files
- 🌐 - Virtual servers
- 🏊 - Pools/Service groups
- 🖥️ - Servers
- 📊 - Monitors
- 🔒 - SSL/Certificates
- 📋 - Policies

## Customization

### Theme Support
F5 Flipper respects your VS Code theme:
- Dark themes
- Light themes
- High contrast themes

### Layout
- Resize the sidebar
- Collapse/expand sections
- Drag and drop to reorder Activity Bar icons

## Keyboard Navigation

- **Arrow Keys** - Navigate tree view
- **Enter** - Open/expand items
- **Space** - Select items
- **Tab** - Move between sections

## Next Steps

- [Basic Usage](basic-usage.md) - Learn common workflows
- [Configuration Parsing](../features/parsing.md) - Understand parsing details
- [AS3 Conversion](../features/conversion.md) - Advanced conversion features
