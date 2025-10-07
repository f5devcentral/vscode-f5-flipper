# Basic Usage

## Loading a Configuration

### Method 1: Browse for File

1. Open the **F5 Flipper** view in the Activity Bar
2. Click the **Browse** button
3. Select a NetScaler `.conf` file or `.tgz` archive
4. Wait for parsing to complete

### Method 2: Open Folder

1. Open a folder containing NetScaler configuration files
2. The extension will detect `.conf` files automatically
3. Select the configuration from the F5 Flipper view

## Exploring Applications

Once a configuration is loaded:

1. **Applications** are listed in the tree view
2. **Hover** over items to see statistics and details
3. **Click** an application to view its configuration
4. **Expand** sections to see detailed objects

### Application Types

- **CS (Content Switching)** - Virtual servers with content-based routing
- **LB (Load Balancing)** - Virtual servers with load balancing
- **GSLB** - Global server load balancing configurations

## Viewing Configuration

### View Original Config Lines

1. Right-click an application
2. Select **"View NS App Lines"**
3. See the original NetScaler configuration

### View JSON Representation

1. Right-click an application
2. Select **"View NS App JSON"**
3. See the abstracted application as JSON

## Generating AS3

### Using FAST Templates

1. Right-click an application
2. Select **"Generate AS3 from FAST Template"**
3. An interactive webview opens with:
   - **Schema** - Template parameter definitions
   - **Start Values** - Default parameters from NetScaler app
   - **Parameters** - Editable JSON values
   - **AS3 Preview** - Live preview of generated AS3

### Editing Parameters

1. Modify the **Parameters** JSON in the editor
2. Click **"Render AS3 from FAST Template"** to update preview
3. Review the generated AS3

### Exporting AS3

1. After previewing, click **"Open AS3 in Editor"**
2. The AS3 declaration opens in a new VS Code tab
3. Save, edit, or deploy as needed

## Using Reports

### YAML Report

1. Expand the **Reports** section in the tree view
2. Click **"Full YAML Report"**
3. View a human-readable summary of all applications

### JSON Report

1. Expand the **Reports** section
2. Click **"Full JSON Report"**
3. View detailed JSON structure of the parsed configuration

### NS Config as JSON

1. Expand the **Reports** section
2. Click **"NS Config as JSON"**
3. View the entire NetScaler config converted to JSON

## Working with Diagnostics

### Viewing Diagnostics

1. Select an application in the tree view
2. Look for diagnostic indicators:
   - 🔴 **Red** - Errors
   - 🟠 **Orange** - Warnings
   - 🟢 **Green** - Information
3. Click the diagnostic to see details

### Understanding Diagnostic Prefixes

- **XC-** - F5 Distributed Cloud recommendations
- **TMOS-** - F5 BIG-IP guidance
- **NGINX-** - NGINX Plus suggestions

## Tips & Tricks

### Quick Navigation

- Use `Ctrl+P` / `Cmd+P` and type `>F5 Flipper` to see all available commands
- Use the search feature in the tree view to filter applications

### Multiple Configurations

- You can load multiple configurations by browsing to different files
- Clear the current view using the refresh button

### Keyboard Shortcuts

- `F1` - Open command palette
- `Ctrl+Shift+P` / `Cmd+Shift+P` - Show all commands
- Search for "F5 Flipper" commands

## Next Steps

- [Understanding the Interface](interface.md) - Deep dive into UI components
- [Diagnostics Engine](../features/diagnostics.md) - Learn about diagnostic rules
- [AS3 Conversion](../features/conversion.md) - Advanced conversion techniques
