# /format-md - Markdown Standardization

## Table of Contents

- [Description](#description)
- [Usage](#usage)
- [Document Categories](#document-categories)
- [Format Standards](#format-standards)
- [Table of Contents Rules](#table-of-contents-rules)
- [Element Standards](#element-standards)
- [Templates](#templates)
- [Exemptions](#exemptions)

---

## Description

Standardize markdown file formatting based on file location and type. Ensures consistency across all documentation, specifications, and project files.

---

## Usage

```
/format-md [file_path]
```

**Arguments**:
- `file_path` (optional): Target markdown file. Defaults to current file.

**Examples**:
```
/format-md
/format-md specs/NEW_FEATURE_SPEC.md
/format-md docs/features/parsing.md
```

---

## Document Categories

Detected automatically from file path:

| Path Pattern | Category | Key Characteristics |
|--------------|----------|---------------------|
| `specs/*.md` | Specification | Metadata header, numbered sections, ToC |
| `docs/**/*.md` | Documentation | Quote subtitle, bullet ToC |
| Root `*.md` | Project Root | Marketing focus, badges, bullet ToC |

---

## Format Standards

### Header Hierarchy

```
#    Title (one per document)
##   Major sections
###  Subsections
#### Detailed sub-items (specs only)
```

### Document Structure

```markdown
# Title
> Subtitle or metadata block
---
## Table of Contents
...
---
## First Content Section
...
---
## Next Section
```

---

## Table of Contents Rules

**Required** for all markdown files except exemptions listed below.

### Placement

Always immediately after title/metadata, before first content section:

```markdown
# Title
> Subtitle / Metadata
---
## Table of Contents   <-- Always here
...
---
## First Content Section
```

### Format by Category

| Category | ToC Style | Section Headers |
|----------|-----------|-----------------|
| **Specifications** | Numbered: `1. [Name](#1-name)` | Numbered: `## 1. Section Name` |
| **Documentation** | Bullets: `- [Name](#name)` | Plain: `## Section Name` |
| **Root files** | Bullets: `- [Name](#name)` | Plain: `## Section Name` |

### Anchor Link Format

- Specs: `#1-section-name` (matches numbered headers)
- Docs/Root: `#section-name` (lowercase, hyphens for spaces)

---

## Element Standards

| Element | Standard |
|---------|----------|
| **Lists** | Use `-` for unordered, `1.` for ordered |
| **Section breaks** | `---` between major H2 sections |
| **Code blocks** | Always include language tag (```typescript, ```bash, etc.) |
| **Links** | Use `[text](path)` format, relative paths preferred |
| **Tables** | Left-align headers, use `\|` delimiters |
| **Status indicators** | ✅ Complete, ❌ Not started, 🚧 In progress |
| **Emphasis** | `**bold**` for key terms, `*italic*` sparingly |

### Metadata Block (Specifications Only)

Required fields:
```markdown
**Status**: DRAFT | IN PROGRESS | ✅ COMPLETE
**Created**: YYYY-MM-DD
**Updated**: YYYY-MM-DD
**Related**: [Doc Name](link.md)
```

Optional fields:
- **Decision**: For ADRs
- **Implementation**: Link to impl spec
- **Author**: If attribution needed

---

## Templates

### Specification Document (`specs/`)

```markdown
# DOCUMENT TITLE
## Optional Subtitle

**Status**: DRAFT
**Created**: YYYY-MM-DD
**Updated**: YYYY-MM-DD
**Related**: [Related Doc](link.md)

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Implementation](#3-implementation)

---

## 1. Problem Statement

Content...

---

## 2. Solution Overview

Content...

---

## 3. Implementation

Content...
```

### Documentation Page (`docs/`)

```markdown
# Page Title

> Brief one-line description of what this page covers

---

## Table of Contents

- [Overview](#overview)
- [Main Section](#main-section)
- [See Also](#see-also)

---

## Overview

Introduction paragraph...

---

## Main Section

### Subsection

Content...

---

## See Also

- [Related Page](link.md)
```

### Project Root File

```markdown
# Project Name

> Short tagline

[![Badge](url)](link)

---

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Contributing](#contributing)

---

## Quick Start

1. Step one
2. Step two

---

## Features

- Feature A
- Feature B

---

## Contributing

...
```

---

## Exemptions

Table of Contents is **not required** for:

- Files under 50 lines
- Navigation files (`_sidebar.md`, `_navbar.md`)
- Issue templates (`.github/ISSUE_TEMPLATE/*.md`)
- `CHANGELOG.md` (uses version headers instead)

---

## Validation Checklist

When formatting a file, verify:

- [ ] Single `#` title at top
- [ ] Table of Contents present (unless exempt)
- [ ] ToC links match actual section headers
- [ ] `---` separators between major sections
- [ ] Code blocks have language tags
- [ ] Lists use `-` for bullets
- [ ] Specs have metadata block
- [ ] Links use relative paths where possible
