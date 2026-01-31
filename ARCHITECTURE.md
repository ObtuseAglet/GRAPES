# GRAPES Extension - Quick Reference

## Architecture

The GRAPES extension is built with a modern architecture using WXT framework:

### Components

1. **Background Script** (`entrypoints/background.ts`)
   - Runs as a service worker
   - Initializes default preferences on install
   - Manages extension lifecycle

2. **Content Script** (`entrypoints/content.ts`)
   - Injected into all web pages
   - Reads user preferences from Chrome storage
   - Dynamically applies custom styles
   - Listens for preference changes in real-time

3. **Popup UI** (`entrypoints/popup/`)
   - React-based user interface
   - Provides controls for customization
   - Saves preferences to Chrome sync storage

### Key Features

#### Client-Side HTML Rendering
- The extension uses CSS injection to modify page appearance
- Styles are applied via a `<style>` element with ID `grapes-custom-styles`
- All modifications happen in the browser without server interaction

#### Preference Storage
- Uses Chrome's `storage.sync` API
- Preferences sync across devices when user is logged into Chrome
- Storage structure:
  ```json
  {
    "preferences": {
      "enabled": true,
      "customStyles": {
        "backgroundColor": "#ffffff",
        "textColor": "#000000",
        "fontSize": "16",
        "fontFamily": "Arial, sans-serif",
        "customCSS": "/* custom rules */"
      }
    }
  }
  ```

#### Real-Time Updates
- Content script listens for storage changes
- Updates apply immediately without page reload
- Toggle on/off without losing settings

### Extension Permissions

- `storage`: Store and sync user preferences
- `activeTab`: Access current tab when popup is opened
- Content scripts run on `<all_urls>` to work universally

### Development Workflow

1. **Local Development**:
   ```bash
   npm run dev
   ```
   - Opens browser with extension loaded
   - Hot reload on file changes
   - DevTools for debugging

2. **Production Build**:
   ```bash
   npm run build
   ```
   - Optimized build in `.output/chrome-mv3/`
   - Minified JavaScript and CSS
   - Ready for manual loading or distribution

3. **Distribution Package**:
   ```bash
   npm run zip
   ```
   - Creates `.zip` file for Chrome Web Store
   - Includes all necessary files
   - Excludes source maps and dev files

### Customization Examples

#### Basic Color Change
Set background to dark mode:
- Background Color: `#1a1a1a`
- Text Color: `#e0e0e0`

#### Font Customization
Use a different font:
- Font Family: `'Roboto', sans-serif`
- Font Size: `18`

#### Advanced CSS
Add custom rules in the Custom CSS field:
```css
/* Hide ads */
.advertisement { display: none !important; }

/* Increase line spacing */
p { line-height: 1.8 !important; }

/* Round images */
img { border-radius: 8px !important; }
```

### Security Considerations

- Extension only modifies local rendering
- No data is sent to external servers
- Preferences stored in Chrome's secure storage
- Uses Manifest V3 security standards
- Content Security Policy enforced

### Browser Compatibility

- Chrome: ✅ Full support (Manifest V3)
- Edge: ✅ Full support (Chromium-based)
- Firefox: ✅ Supported with separate build (`npm run build:firefox`)

### Troubleshooting

**Extension not working?**
- Ensure it's enabled in `chrome://extensions/`
- Check that "Enable customization" toggle is on
- Verify preferences are saved (check browser console)

**Styles not applying?**
- Some websites may have strict CSP
- Check for `!important` flag in custom CSS
- Inspect element to verify style injection

**Performance issues?**
- Limit complex CSS selectors
- Avoid excessive custom CSS rules
- Consider targeting specific websites

## Future Enhancements

Potential features for future versions:
- Per-website preferences
- Import/export settings
- Pre-made themes
- Visual CSS editor
- Website-specific toggles
- Accessibility presets (high contrast, large text, etc.)
