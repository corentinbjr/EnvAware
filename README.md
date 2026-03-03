<div align="center">
  <img src="icons/icon-128.png" alt="EnvAware Logo" width="128" height="128">
  <h1>EnvAware</h1>
  <p><strong>Instantly identify your environment with customizable, pattern-based watermark overlays.</strong></p>
  <p>
    <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue">
    <img alt="Manifest" src="https://img.shields.io/badge/manifest-v3-green">
    <img alt="License" src="https://img.shields.io/badge/license-MIT-yellow">
    <img alt="Dependencies" src="https://img.shields.io/badge/dependencies-0-brightgreen">
  </p>
</div>

---

## Overview

**EnvAware** is a lightweight Chrome Extension that helps developers, QA engineers, and teams instantly recognize which environment they're viewing. It injects a customizable, non-intrusive watermark overlay onto web pages so you never accidentally perform a test transaction on Production or wonder if you're looking at Staging.

Zero dependencies. No build step. Pure vanilla JS.

## Key Features

- **Pattern-Based Matching** -- Use wildcards (`*`) to match subdomains or URL structures (e.g., `*.staging.*`, `*int-*`). Exact URLs always take priority over patterns.
- **Live Preview** -- All changes to watermark text, color, size, spacing, and opacity update instantly in the active tab. No page reload needed.
- **Quick Presets** -- Built-in presets for LOCAL, DEV, STAGING, and PROD. Create your own custom presets with full control over every visual parameter. Apply a preset with one click.
- **Preset Linking** -- Configs linked to a preset stay in sync. Manually tweaking a visual setting automatically detaches from the preset and creates a site-specific override.
- **Site-Specific Overrides** -- When a pattern config matches, customize settings for a single site without affecting all other matches. The popup guides you through this with contextual banners.
- **Exclusions** -- Exclude individual sites or specific URLs from a pattern match. Manage exclusions from the popup or the options page.
- **Tab Title Prefixing** -- Optionally prepend the environment name to the browser tab title (e.g., `[LOCAL] App Name`) for quick identification in crowded tab bars.
- **Export / Import** -- Share your full setup (configs + presets) across devices or with your team via a single JSON file. Backwards-compatible with older exports.
- **Overlap Detection** -- The options page automatically flags patterns that may conflict, so you can spot ambiguous rules at a glance.
- **Search & Filter** -- Quickly find configurations in the options page with real-time search.
- **Dark Theme** -- Clean, modern dark UI throughout (popup + options page).

## Installation

### Chrome Web Store (Recommended)
https://chromewebstore.google.com/detail/envaware/ajgcfalfpjlkmimkjombnoocpccipknp

### Manual Installation (Developer Mode)
1. Clone this repository:
   ```bash
   git clone https://github.com/corentinbjr/EnvAware.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the cloned directory.
5. Pin the extension to your toolbar for easy access.

## Usage

### Quick Start (Popup)
1. Navigate to any website.
2. Click the EnvAware icon in your toolbar.
3. Toggle the watermark on, pick a preset or customize the settings.
4. Changes apply instantly -- no reload needed.

### Managing Configurations (Options Page)
1. Click **Manage All Configurations** at the bottom of the popup, or right-click the extension icon and select **Options**.
2. Create, edit, delete, search, and reorder your configurations.
3. Use **Export** to back up your setup, or **Import** to restore / share it.

### URL Pattern Matching

| Pattern | Description | Example Matches |
|---------|-------------|-----------------|
| `https://app.example.com` | **Exact match** (highest priority) | `https://app.example.com` |
| `*staging*` | **Contains** -- matches any URL with "staging" | `https://staging.app.com`, `http://app.staging.net` |
| `https://*.dev.local` | **Subdomain** -- matches any subdomain | `https://api.dev.local`, `https://ui.dev.local` |
| `*int-*` | **Partial** -- matches specific prefixes/suffixes | `https://int-01.company.com` |

When multiple patterns match, the most specific rule wins automatically. Exact URLs always beat wildcards.

### Exclusions
From the popup, when viewing a site matched by a pattern:
- **Disable site** -- excludes the entire origin from the pattern.
- **Disable URL** -- excludes only the current page URL.
- Exclusions can be managed per-config in the options page.

## Architecture

Built with vanilla HTML, CSS, and JavaScript. Zero external dependencies, no build step, no bundler.

```
EnvAware/
├── manifest.json               # Chrome Manifest V3
├── popup.html                  # Browser action popup
├── options.html                # Full configuration management page
├── css/
│   ├── base.css                # Design system, variables, shared components
│   ├── banners.css             # Override, preset, and exclusion banners
│   ├── presets.css             # Preset manager component styles
│   ├── popup.css               # Popup-specific layout
│   └── options.css             # Options page layout
├── js/
│   ├── core.js                 # Shared namespace, storage, utilities
│   ├── content.js              # Content script — SVG watermark injection
│   ├── presets.js              # Preset manager UI component
│   ├── popup.js                # Popup controller
│   ├── options.js              # Options page controller
│   ├── options-templates.js    # Config item HTML builder
│   └── options-import-export.js # Export/import logic
└── icons/                      # Extension icons (16–128px + SVG)
```

### Script Contexts
- **Content script** (`core.js` + `content.js`): Injected into every page. Reads configs from `chrome.storage.sync`, finds the best match for the current URL, and renders an SVG watermark overlay.
- **Popup** (`core.js` + `presets.js` + `popup.js`): Per-site settings with live preview. Sends messages to the content script for instant updates.
- **Options page** (`core.js` + `presets.js` + `options-templates.js` + `options-import-export.js` + `options.js`): Full CRUD for configurations and presets, search, overlap detection, export/import.

## Contributing

Contributions are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License.

## Author

Corentin B.