<div align="center">
  <img src="icons/icon-128.png" alt="EnvAware Logo" width="128" height="128">
  <h1>EnvAware</h1>
  <p><strong>Instantly identify your environment with customizable, pattern-based watermark overlays.</strong></p>
</div>

---

## 🌟 Overview
**EnvAware** is a lightweight, high-performance Chrome Extension designed for developers, QA engineers, and content creators. It helps you instantly recognize which environment you are currently viewing (e.g., Local, Dev, Staging, Production) by injecting a customizable, non-intrusive watermark directly onto the webpage.

Never accidentally perform a test transaction on Production or wonder if you are looking at the staging site again!

## ✨ Key Features
- 🎯 **Pattern-Based Matching:** Use wildcards (`*`) to match subdomains or specific URL structures (e.g., `*.staging.*` or `*int-*`).
- ⚡ **Live Preview:** Changes to watermark size, color, spacing, and opacity update instantly in the active tab without requiring a page reload.
- 🎨 **Visual Customization:** Full control over text, color, opacity, size, and spacing.
- 🔖 **Smart Specificity:** If multiple configurations match a URL, EnvAware automatically applies the most specific rule (exact matches always win).
- 🏷 **Tab Title Prefixing:** Optionally prepend the environment name to the browser tab title (e.g., `[LOCAL] App Name`) for quick identification in crowded tab bars.
- 💾 **Quick Presets:** Save your favorite colors and texts as quick-access presets directly from the popup.
- 🔄 **Export/Import:** Easily share your setup across different devices or sync configurations with your team via JSON export.

## 🚀 Installation

### Option 1: Chrome Web Store (Recommended)
*Link coming soon!*

### Option 2: Manual Installation (Developer Mode)
1. Clone this repository or download the ZIP file and extract it.
   ```bash
   git clone https://github.com/corentinbjr/EnvAware.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the configured directory.
5. Pin the extension to your toolbar for easy access!

## 🛠 Usage & Configuration

### Creating a Configuration
1. Click the EnvAware icon in your browser toolbar.
2. Click **Manage All Configurations** to open the Options page.
3. Click the **+ New Config** button.
4. Define your URL pattern and desired styling.

### URL Pattern Matching Examples
EnvAware uses simple glob patterns to make configuration easy and secure:

| Pattern | Description | Example Matches |
|---------|-------------|-----------------|
| `https://app.example.com` | **Exact match:** Highest priority. | `https://app.example.com` |
| `*staging*` | **Contains:** Matches any URL containing "staging". | `https://staging.app.com`, `http://app.staging.net` |
| `https://*.dev.local` | **Subdomain:** Matches any subdomain under `dev.local`. | `https://api.dev.local`, `https://ui.dev.local` |
| `*int-*` | **Partial:** Matches URLs with specific prefixes/suffixes. | `https://int-01.company.com` |

### Conflict Resolution & Overlap Detection
When an origin matches multiple patterns, EnvAware calculates a **specificity score**:
1. Exact URLs (no wildcards) have the highest priority (`Infinity`).
2. Patterns with fewer wildcards and more literal characters score implicitly higher.

The visual Options page automatically detects potential conflicts and flags overlapping patterns with an ⚠️ indicator, making it easy to see where rules might collide.

## 🏗️ Architecture
EnvAware is built using Vanilla HTML, CSS, and JavaScript, ensuring maximum performance, minimal memory footprint, and zero external dependencies.

```text
EnvAware/
├── manifest.json      # Manifest V3
├── popup.html         # Extension popup UI
├── options.html       # Full-page configuration management UI
├── content.js         # Injects the SVG watermark overlay seamlessly
├── css/               # Modular & scoped styling
│   ├── base.css       # Shared design system & variables
│   ├── popup.css      
│   └── options.css    
├── js/                # Modular logic mapped to namespaces
│   ├── core.js        # Shared routing, specificty scoring, and utils
│   ├── popup.js       
│   └── options.js     
└── icons/             # Chrome Web Store assets
```

## 🤝 Contributing
Contributions are always welcome! 

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License
Distributed under the MIT License.
