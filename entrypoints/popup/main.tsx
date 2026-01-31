import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import '../../assets/popup.css';

function App() {
  const [enabled, setEnabled] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState('');
  const [textColor, setTextColor] = useState('');
  const [fontSize, setFontSize] = useState('');
  const [fontFamily, setFontFamily] = useState('');
  const [customCSS, setCustomCSS] = useState('');

  // Load preferences on mount
  useEffect(() => {
    browser.storage.sync.get(['preferences']).then((result) => {
      const prefs = result.preferences || { enabled: true, customStyles: {} };
      setEnabled(prefs.enabled);
      setBackgroundColor(prefs.customStyles.backgroundColor || '');
      setTextColor(prefs.customStyles.textColor || '');
      setFontSize(prefs.customStyles.fontSize || '');
      setFontFamily(prefs.customStyles.fontFamily || '');
      setCustomCSS(prefs.customStyles.customCSS || '');
    });
  }, []);

  // Save preferences
  const savePreferences = () => {
    const preferences = {
      enabled,
      customStyles: {
        backgroundColor,
        textColor,
        fontSize,
        fontFamily,
        customCSS,
      },
    };

    browser.storage.sync.set({ preferences }).then(() => {
      console.log('Preferences saved');
      // Show a brief success message
      const saveButton = document.getElementById('save-button');
      if (saveButton) {
        saveButton.textContent = 'Saved!';
        setTimeout(() => {
          saveButton.textContent = 'Save Preferences';
        }, 2000);
      }
    });
  };

  return (
    <div className="popup-container">
      <h1>GRAPES Settings</h1>
      <p className="subtitle">Customize website appearance</p>

      <div className="setting-group">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>Enable customization</span>
        </label>
      </div>

      <div className="setting-group">
        <label>
          Background Color:
          <input
            type="color"
            value={backgroundColor || '#ffffff'}
            onChange={(e) => setBackgroundColor(e.target.value)}
          />
        </label>
      </div>

      <div className="setting-group">
        <label>
          Text Color:
          <input
            type="color"
            value={textColor || '#000000'}
            onChange={(e) => setTextColor(e.target.value)}
          />
        </label>
      </div>

      <div className="setting-group">
        <label>
          Font Size (px):
          <input
            type="number"
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            placeholder="16"
            min="10"
            max="32"
          />
        </label>
      </div>

      <div className="setting-group">
        <label>
          Font Family:
          <input
            type="text"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            placeholder="Arial, sans-serif"
          />
        </label>
      </div>

      <div className="setting-group">
        <label>
          Custom CSS:
          <textarea
            value={customCSS}
            onChange={(e) => setCustomCSS(e.target.value)}
            placeholder="Enter custom CSS rules..."
            rows={5}
          />
        </label>
      </div>

      <button id="save-button" onClick={savePreferences}>
        Save Preferences
      </button>
    </div>
  );
}

export default App;

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
