import { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { browser } from 'wxt/browser';
import type { GrapesPreferences } from '../../lib/types';

// Onboarding step components
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="onboarding-step">
      <div className="step-icon">🍇</div>
      <h1>Welcome to GRAPES</h1>
      <p className="step-subtitle">
        <strong>G</strong>raphical <strong>R</strong>endering <strong>A</strong>lterations for{' '}
        <strong>P</strong>rivacy, <strong>E</strong>nhancement and <strong>S</strong>tealth
      </p>
      <div className="step-content">
        <p>
          GRAPES protects your privacy by detecting and blocking invasive tracking technologies that
          websites use to monitor your behavior.
        </p>
        <div className="feature-list">
          <div className="feature-item">
            <span className="feature-icon">🛡️</span>
            <div>
              <strong>Session Replay Detection</strong>
              <p>Stops sites from recording your every click and keystroke</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔍</span>
            <div>
              <strong>Fingerprint Protection</strong>
              <p>Prevents unique browser fingerprinting techniques</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📡</span>
            <div>
              <strong>Tracking Pixel Blocking</strong>
              <p>Blocks invisible trackers embedded in pages</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">👁️</span>
            <div>
              <strong>Visibility Monitoring</strong>
              <p>Prevents tracking when you switch tabs</p>
            </div>
          </div>
        </div>
      </div>
      <button type="button" className="primary-button" onClick={onNext}>
        Get Started →
      </button>
    </div>
  );
}

function ModeSelectionStep({
  selectedMode,
  onSelectMode,
  onNext,
  onBack,
}: {
  selectedMode: 'full' | 'detection-only';
  onSelectMode: (mode: 'full' | 'detection-only') => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="onboarding-step">
      <div className="step-indicator">Step 1 of 2</div>
      <h2>Choose Your Protection Level</h2>
      <p className="step-subtitle">How would you like GRAPES to handle tracking?</p>
      <div className="mode-options">
        <button
          type="button"
          className={`mode-option ${selectedMode === 'detection-only' ? 'selected' : ''}`}
          onClick={() => onSelectMode('detection-only')}
        >
          <div className="mode-icon">👁️</div>
          <h3>Detection Only</h3>
          <p className="mode-badge">Recommended for new users</p>
          <ul>
            <li>✓ Detects tracking on every site</li>
            <li>✓ Notifies you when threats are found</li>
            <li>✓ Asks before enabling protection</li>
            <li>✓ Won't break any websites</li>
          </ul>
        </button>
        <button
          type="button"
          className={`mode-option ${selectedMode === 'full' ? 'selected' : ''}`}
          onClick={() => onSelectMode('full')}
        >
          <div className="mode-icon">🛡️</div>
          <h3>Full Protection</h3>
          <p className="mode-badge">Maximum privacy</p>
          <ul>
            <li>✓ Automatically blocks all tracking</li>
            <li>✓ No prompts or interruptions</li>
            <li>✓ Silent protection in background</li>
            <li>⚠️ May break some site features</li>
          </ul>
        </button>
      </div>
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="primary-button" onClick={onNext}>
          Continue →
        </button>
      </div>
    </div>
  );
}

function CustomStylesStep({
  enableCustomStyles,
  onToggleStyles,
  onFinish,
  onBack,
}: {
  enableCustomStyles: boolean;
  onToggleStyles: (enabled: boolean) => void;
  onFinish: () => void;
  onBack: () => void;
}) {
  return (
    <div className="onboarding-step">
      <div className="step-indicator">Step 2 of 2</div>
      <h2>Custom Page Styles</h2>
      <p className="step-subtitle">Would you like to customize how web pages look?</p>
      <div className="step-content">
        <div className="style-options">
          <button
            type="button"
            className={`style-option ${!enableCustomStyles ? 'selected' : ''}`}
            onClick={() => onToggleStyles(false)}
          >
            <div className="option-radio">
              <div className={`radio-circle ${!enableCustomStyles ? 'checked' : ''}`} />
            </div>
            <div>
              <h4>Keep it Simple</h4>
              <p>Don't modify page appearance (recommended)</p>
              <p className="option-note">✓ Maximum stealth - pages won't detect GRAPES</p>
            </div>
          </button>
          <button
            type="button"
            className={`style-option ${enableCustomStyles ? 'selected' : ''}`}
            onClick={() => onToggleStyles(true)}
          >
            <div className="option-radio">
              <div className={`radio-circle ${enableCustomStyles ? 'checked' : ''}`} />
            </div>
            <div>
              <h4>Enable Custom Styles</h4>
              <p>Change colors, fonts, and inject custom CSS</p>
              <p className="option-note">⚠️ May be detectable by some websites</p>
            </div>
          </button>
        </div>
      </div>
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="primary-button finish-button" onClick={onFinish}>
          🎉 Start Using GRAPES
        </button>
      </div>
    </div>
  );
}

function CompletionStep() {
  const closeTab = () => {
    window.close();
  };

  return (
    <div className="onboarding-step completion">
      <div className="step-icon success">✓</div>
      <h1>You're All Set!</h1>
      <p className="step-subtitle">GRAPES is now protecting your privacy</p>
      <div className="completion-tips">
        <h3>Quick Tips:</h3>
        <ul>
          <li>
            <strong>🍇 Click the GRAPES icon</strong> to see threats on the current page
          </li>
          <li>
            <strong>🔄 Change settings anytime</strong> from the extension popup
          </li>
          <li>
            <strong>⚡ Per-site controls</strong> let you enable/disable protection for specific
            sites
          </li>
        </ul>
      </div>
      <button type="button" className="primary-button" onClick={closeTab}>
        Close This Tab
      </button>
    </div>
  );
}

function OnboardingApp() {
  const [step, setStep] = useState(0);
  const [selectedMode, setSelectedMode] = useState<'full' | 'detection-only'>('detection-only');
  const [enableCustomStyles, setEnableCustomStyles] = useState(false);

  const handleFinish = async () => {
    // Save preferences
    const preferences: GrapesPreferences = {
      globalMode: selectedMode,
      siteSettings: {},
      customStylesEnabled: enableCustomStyles,
      autoDarkMode: false,
      customStyles: {},
      siteStyles: {},
      suppressedNotificationDomains: [],
      onboardingComplete: true,
      loggingEnabled: true,
    };

    await browser.runtime.sendMessage({
      type: 'SET_PREFERENCES',
      preferences,
    });

    await browser.runtime.sendMessage({ type: 'COMPLETE_ONBOARDING' });

    setStep(3);
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
        {step === 1 && (
          <ModeSelectionStep
            selectedMode={selectedMode}
            onSelectMode={setSelectedMode}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <CustomStylesStep
            enableCustomStyles={enableCustomStyles}
            onToggleStyles={setEnableCustomStyles}
            onFinish={handleFinish}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && <CompletionStep />}
      </div>
      <div className="onboarding-footer">
        <p>GRAPES respects your privacy. No data is ever sent to external servers.</p>
      </div>
    </div>
  );
}

// Styles
const style = document.createElement('style');
style.textContent = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
  }

  .onboarding-container {
    width: 100%;
    max-width: 700px;
  }

  .onboarding-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    padding: 40px;
    animation: slideUp 0.5s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .onboarding-step {
    text-align: center;
  }

  .step-indicator {
    display: inline-block;
    background: #e8f5e9;
    color: #27ae60;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 20px;
  }

  .step-icon {
    font-size: 64px;
    margin-bottom: 20px;
  }

  .step-icon.success {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #27ae60, #2ecc71);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 40px;
  }

  h1 {
    color: #333;
    margin-bottom: 10px;
    font-size: 28px;
  }

  h2 {
    color: #333;
    margin-bottom: 10px;
    font-size: 24px;
  }

  .step-subtitle {
    color: #666;
    margin-bottom: 30px;
    font-size: 16px;
    line-height: 1.5;
  }

  .step-content {
    text-align: left;
    margin-bottom: 30px;
  }

  .step-content > p {
    color: #555;
    line-height: 1.6;
    margin-bottom: 25px;
  }

  .feature-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .feature-item {
    display: flex;
    align-items: flex-start;
    gap: 15px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 12px;
  }

  .feature-icon {
    font-size: 28px;
  }

  .feature-item strong {
    display: block;
    color: #333;
    margin-bottom: 4px;
  }

  .feature-item p {
    color: #666;
    font-size: 14px;
    margin: 0;
  }

  .mode-options {
    display: flex;
    gap: 20px;
    margin-bottom: 30px;
  }

  .mode-option {
    flex: 1;
    padding: 25px;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: left;
    background: none;
    font: inherit;
    color: inherit;
  }

  .mode-option:hover {
    border-color: #667eea;
    transform: translateY(-2px);
  }

  .mode-option.selected {
    border-color: #667eea;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  }

  .mode-icon {
    font-size: 40px;
    margin-bottom: 15px;
  }

  .mode-option h3 {
    color: #333;
    margin-bottom: 5px;
  }

  .mode-badge {
    display: inline-block;
    background: #e8f5e9;
    color: #27ae60;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 15px;
  }

  .mode-option ul {
    list-style: none;
    color: #666;
    font-size: 14px;
  }

  .mode-option li {
    padding: 5px 0;
  }

  .style-options {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-bottom: 30px;
  }

  .style-option {
    display: flex;
    align-items: flex-start;
    gap: 15px;
    padding: 20px;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: left;
    background: none;
    font: inherit;
    color: inherit;
  }

  .style-option:hover {
    border-color: #667eea;
  }

  .style-option.selected {
    border-color: #667eea;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  }

  .option-radio {
    flex-shrink: 0;
    margin-top: 3px;
  }

  .radio-circle {
    width: 20px;
    height: 20px;
    border: 2px solid #ccc;
    border-radius: 50%;
    transition: all 0.2s ease;
  }

  .radio-circle.checked {
    border-color: #667eea;
    background: #667eea;
    box-shadow: inset 0 0 0 4px white;
  }

  .style-option h4 {
    color: #333;
    margin-bottom: 5px;
  }

  .style-option p {
    color: #666;
    font-size: 14px;
    margin: 0;
  }

  .option-note {
    margin-top: 8px !important;
    font-size: 12px !important;
    opacity: 0.8;
  }

  .button-row {
    display: flex;
    justify-content: space-between;
    gap: 15px;
  }

  .primary-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 14px 32px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .primary-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  }

  .secondary-button {
    background: white;
    color: #666;
    border: 2px solid #e0e0e0;
    padding: 14px 32px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .secondary-button:hover {
    border-color: #667eea;
    color: #667eea;
  }

  .finish-button {
    flex: 1;
  }

  .completion-tips {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 25px;
    margin-bottom: 30px;
    text-align: left;
  }

  .completion-tips h3 {
    color: #333;
    margin-bottom: 15px;
  }

  .completion-tips ul {
    list-style: none;
  }

  .completion-tips li {
    padding: 10px 0;
    color: #555;
    line-height: 1.5;
  }

  .completion-tips strong {
    color: #333;
  }

  .onboarding-footer {
    text-align: center;
    margin-top: 20px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 13px;
  }

  @media (max-width: 600px) {
    .onboarding-card {
      padding: 25px;
    }

    .mode-options {
      flex-direction: column;
    }

    .button-row {
      flex-direction: column;
    }

    .secondary-button {
      order: 2;
    }
  }
`;
document.head.appendChild(style);

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<OnboardingApp />);
}
