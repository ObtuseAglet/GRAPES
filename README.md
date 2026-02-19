# GRAPES

**GRAPES** (General Rendering And Preference Extension System) is a Chrome browser extension built with [WXT](https://wxt.dev/) that allows users to customize the appearance of websites based on their preferences through client-side HTML rendering.

## Features

- 🎨 **Custom Styling**: Apply custom colors, fonts, and CSS to any website
- 💾 **Persistent Preferences**: Settings are saved and synced across devices
- 🔧 **User-Friendly Interface**: Easy-to-use popup interface for configuration
- ⚡ **Real-Time Updates**: Changes apply immediately to active tabs
- 🌐 **Universal**: Works on all websites

## Installation

### For Development

1. Clone the repository:
   ```bash
   git clone https://github.com/ObtuseAglet/GRAPES.git
   cd GRAPES
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the `.output/chrome-mv3` directory

### For Production

Build and package the extension:
```bash
npm run zip
```

This creates a `.zip` file in `.output` that can be distributed or uploaded to the Chrome Web Store.

## Usage

1. Click the GRAPES extension icon in your Chrome toolbar
2. Configure your preferences:
   - **Enable/Disable**: Toggle customization on or off
   - **Background Color**: Choose a custom background color
   - **Text Color**: Set your preferred text color
   - **Font Size**: Adjust the base font size (10-32px)
   - **Font Family**: Specify a custom font family
   - **Custom CSS**: Add advanced custom CSS rules
3. Click "Save Preferences" to apply your changes
4. Visit any website to see your customizations in action!

## Development

### Available Scripts

- `npm run dev` - Start development mode with hot reload
- `npm run dev:firefox` - Start development mode for Firefox
- `npm run build` - Build for production (Chrome)
- `npm run build:firefox` - Build for Firefox
- `npm run zip` - Create distribution package for Chrome
- `npm run zip:firefox` - Create distribution package for Firefox

### Project Structure

```
GRAPES/
├── entrypoints/
│   ├── background.ts       # Background service worker
│   ├── content.ts          # Content script for page modification
│   └── popup/
│       ├── index.html      # Popup HTML template
│       └── main.ts         # Popup TypeScript (vanilla; React migration planned)
├── assets/
│   └── popup.css          # Popup styles
├── public/
│   └── icon.svg           # Extension icon
├── wxt.config.ts          # WXT configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Project dependencies
```

## How It Works

1. **Background Script**: Initializes the extension and sets default preferences on install
2. **Content Script**: Runs on all web pages, reads user preferences, and applies custom styles by injecting CSS
3. **Popup Interface**: Provides a user-friendly React-based UI for configuring preferences
4. **Storage**: Uses Chrome's `storage.sync` API to persist and sync preferences across devices

## Technologies

- [WXT](https://wxt.dev/) - Modern web extension framework
- [React](https://react.dev/) - UI library for the popup interface
- [TypeScript](https://www.typescriptlang.org/) - Type-safe development
- [Vite](https://vitejs.dev/) - Fast build tool (integrated with WXT)

## Browser Support

- ✅ Chrome (Manifest V3)
- ✅ Firefox (with separate build)
- ✅ Edge (Chromium-based)

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
