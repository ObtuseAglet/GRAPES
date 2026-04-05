import { useState } from 'react';
import { api } from '../api';
import type { ReviewRequestPayload } from '../api';

const SERVICE_TYPES = [
  { value: '', label: 'Select a category...' },
  { value: 'error-monitoring', label: 'Error Monitoring (e.g. Sentry, Bugsnag, Rollbar)' },
  { value: 'performance-monitoring', label: 'Performance Monitoring (e.g. New Relic, Datadog)' },
  { value: 'log-aggregation', label: 'Log Aggregation (e.g. Loggly, Sumo Logic)' },
  { value: 'customer-support', label: 'Customer Support (e.g. Intercom, Zendesk)' },
  { value: 'other', label: 'Other functional service' },
];

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export function ReviewRequest() {
  const [form, setForm] = useState<ReviewRequestPayload>({
    domain: '',
    companyName: '',
    contactEmail: '',
    serviceType: '',
    description: '',
  });
  const [state, setState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function updateField(field: keyof ReviewRequestPayload, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('submitting');
    setErrorMsg('');

    try {
      await api.submitReviewRequest(form);
      setState('success');
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    }
  }

  if (state === 'success') {
    return (
      <div className="page">
        <h1>Request Submitted</h1>
        <div className="review-success">
          <div className="review-success-icon">&#10003;</div>
          <h2>Thank you for your submission</h2>
          <p>
            We have received your review request for <strong>{form.domain}</strong>.
            Our team will evaluate whether your service qualifies as a functional
            (non-surveillance) tool and respond to <strong>{form.contactEmail}</strong>.
          </p>
          <p className="review-success-note">
            Approved domains will be moved to our functional services allowlist, meaning
            GRAPES will not block requests to your service by default.
          </p>
          <button
            type="button"
            className="review-submit-btn"
            onClick={() => {
              setForm({ domain: '', companyName: '', contactEmail: '', serviceType: '', description: '' });
              setState('idle');
            }}
          >
            Submit another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Request Domain Review</h1>
      <p className="page-desc">
        GRAPES blocks surveillance trackers but intentionally allows functional services
        like error monitors, log aggregators, and support widgets. If your service is
        being incorrectly blocked, submit a review request below.
      </p>

      <div className="review-info-cards">
        <div className="review-info-card">
          <div className="review-info-icon">&#128274;</div>
          <h3>What we block</h3>
          <p>Ad networks, behavioral analytics, retargeting pixels, and session replay tools that build user profiles.</p>
        </div>
        <div className="review-info-card">
          <div className="review-info-icon">&#10003;</div>
          <h3>What we allow</h3>
          <p>Error monitoring, APM, log aggregation, and customer support tools that don't track users across sites.</p>
        </div>
        <div className="review-info-card">
          <div className="review-info-icon">&#128269;</div>
          <h3>Review criteria</h3>
          <p>We evaluate whether a service collects PII for profiling, shares data with ad networks, or tracks users cross-site.</p>
        </div>
      </div>

      <form className="review-form" onSubmit={handleSubmit}>
        <h2>Submission Form</h2>

        {state === 'error' && (
          <div className="error-msg">{errorMsg}</div>
        )}

        <div className="review-field">
          <label htmlFor="rr-domain">Domain <span className="review-required" aria-hidden="true">*</span></label>
          <input
            id="rr-domain"
            type="text"
            className="filter-input"
            placeholder="e.g. sentry.io"
            required
            aria-required="true"
            maxLength={253}
            value={form.domain}
            onChange={(e) => updateField('domain', e.target.value)}
          />
          <span className="review-hint">The domain your service operates on</span>
        </div>

        <div className="review-field">
          <label htmlFor="rr-company">Company Name <span className="review-required" aria-hidden="true">*</span></label>
          <input
            id="rr-company"
            type="text"
            className="filter-input"
            placeholder="e.g. Functional Software Inc."
            required
            aria-required="true"
            maxLength={200}
            value={form.companyName}
            onChange={(e) => updateField('companyName', e.target.value)}
          />
        </div>

        <div className="review-field">
          <label htmlFor="rr-email">Contact Email <span className="review-required" aria-hidden="true">*</span></label>
          <input
            id="rr-email"
            type="email"
            className="filter-input"
            placeholder="e.g. privacy@yourcompany.com"
            required
            aria-required="true"
            value={form.contactEmail}
            onChange={(e) => updateField('contactEmail', e.target.value)}
          />
          <span className="review-hint">We will respond to this address with our decision</span>
        </div>

        <div className="review-field">
          <label htmlFor="rr-type">Service Type <span className="review-required" aria-hidden="true">*</span></label>
          <select
            id="rr-type"
            className="filter-select"
            required
            aria-required="true"
            value={form.serviceType}
            onChange={(e) => updateField('serviceType', e.target.value)}
          >
            {SERVICE_TYPES.map((t) => (
              <option key={t.value} value={t.value} disabled={t.value === ''}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="review-field">
          <label htmlFor="rr-desc">Description <span className="review-required" aria-hidden="true">*</span></label>
          <textarea
            id="rr-desc"
            className="filter-input review-textarea"
            placeholder="Describe what your service does, what data it collects, and why it should not be classified as a surveillance tracker. Include links to your privacy policy if available."
            required
            aria-required="true"
            maxLength={2000}
            rows={5}
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
          />
          <span className="review-hint" aria-live="polite">{form.description.length}/2000 characters</span>
        </div>

        {!form.serviceType && (
          <div className="review-hint" style={{ marginBottom: '8px' }}>Please select a service type to submit.</div>
        )}
        <button
          type="submit"
          className="review-submit-btn"
          disabled={state === 'submitting' || !form.serviceType}
          aria-disabled={state === 'submitting' || !form.serviceType}
        >
          {state === 'submitting' ? 'Submitting...' : 'Submit Review Request'}
        </button>
      </form>
    </div>
  );
}
