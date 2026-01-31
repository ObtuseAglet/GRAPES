# GRAPES Extension Flow Diagram

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         GRAPES Extension                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│                  │         │                  │         │                  │
│   Background     │◄────────►   Chrome         │◄────────►   Content        │
│   Script         │         │   Storage        │         │   Script         │
│  (Service Worker)│         │  (Sync Storage)  │         │  (All Pages)     │
│                  │         │                  │         │                  │
└────────┬─────────┘         └──────────────────┘         └────────┬─────────┘
         │                                                          │
         │ 1. Initialize                                           │
         │    default prefs                                        │
         │    on install                                           │
         │                                                          │
         │                                                          │ 2. Read prefs
         │                                                          │    from storage
         │                                                          │
         │                                                          ▼
         │                                                   ┌──────────────┐
         │                                                   │              │
         │                                                   │  Inject CSS  │
         │                                                   │  Dynamically │
         │                                                   │              │
         │                                                   └──────┬───────┘
         │                                                          │
         │                                                          │ 3. Apply to
         │                                                          │    webpage
         │                                                          │
         │                                                          ▼
         │                                                   ┌──────────────┐
         │                                                   │              │
         │                                                   │   Modified   │
         │                                                   │   Webpage    │
         │                                                   │              │
         │                                                   └──────────────┘
         │
         │
         ▼
┌────────────────────┐
│                    │
│   Popup UI         │
│   (React)          │
│                    │
│  ┌──────────────┐  │
│  │ Enable/      │  │
│  │ Disable      │  │
│  └──────────────┘  │
│  ┌──────────────┐  │
│  │ Background   │  │         4. User changes settings
│  │ Color        │  │────────────────────────┐
│  └──────────────┘  │                        │
│  ┌──────────────┐  │                        │
│  │ Text Color   │  │                        │
│  └──────────────┘  │                        │
│  ┌──────────────┐  │                        │
│  │ Font Size    │  │                        │
│  └──────────────┘  │                        │
│  ┌──────────────┐  │                        │
│  │ Font Family  │  │                        │
│  └──────────────┘  │                        │
│  ┌──────────────┐  │                        │
│  │ Custom CSS   │  │                        │
│  └──────────────┘  │                        │
│  ┌──────────────┐  │                        │
│  │ Save Button  │  │                        │
│  └──────────────┘  │                        │
│                    │                        │
└────────────────────┘                        │
                                              │
                                              ▼
                                      ┌────────────────┐
                                      │                │
                                      │  Save to       │
                                      │  Chrome        │
                                      │  Storage       │
                                      │                │
                                      └────────┬───────┘
                                              │
                                              │ 5. Storage change
                                              │    event triggered
                                              │
                                              ▼
                                      ┌────────────────┐
                                      │                │
                                      │  Content       │
                                      │  Script        │
                                      │  Listener      │
                                      │                │
                                      └────────┬───────┘
                                              │
                                              │ 6. Re-apply
                                              │    styles
                                              │
                                              ▼
                                      ┌────────────────┐
                                      │                │
                                      │  Page Updates  │
                                      │  in Real-Time  │
                                      │                │
                                      └────────────────┘
```

## Data Flow

### Initial Load
1. User installs extension → Background script sets default preferences
2. User visits webpage → Content script loads
3. Content script reads preferences from Chrome storage
4. Content script injects `<style>` element with custom CSS
5. Webpage appearance is modified

### User Updates Settings
1. User clicks extension icon → Popup opens
2. User modifies settings (colors, fonts, CSS)
3. User clicks "Save Preferences"
4. Popup saves to Chrome storage (sync)
5. Storage change event fires
6. Content script listener detects change
7. Content script removes old `<style>` element
8. Content script creates new `<style>` element with updated CSS
9. Webpage appearance updates immediately (no reload needed)

## Storage Structure

```json
{
  "preferences": {
    "enabled": true,
    "customStyles": {
      "backgroundColor": "#ffffff",
      "textColor": "#000000",
      "fontSize": "16",
      "fontFamily": "Arial, sans-serif",
      "customCSS": "/* optional custom rules */"
    }
  }
}
```

## File Responsibilities

| File | Type | Responsibility |
|------|------|----------------|
| `background.ts` | Service Worker | Extension lifecycle, initial setup |
| `content.ts` | Content Script | CSS injection, style management |
| `popup/main.tsx` | React UI | User interface, settings management |
| `popup.css` | Styles | UI styling |
| `manifest.json` | Config | Extension permissions and metadata |
| `wxt.config.ts` | Config | Build configuration |

## Extension Permissions

- **storage**: Store and sync user preferences across devices
- **activeTab**: Access active tab when popup is opened

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Primary target (MV3) |
| Edge | ✅ Full | Chromium-based |
| Firefox | ✅ Full | Separate build required |
| Safari | ⚠️ Limited | Would need WebKit-specific build |

