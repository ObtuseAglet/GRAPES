export function ProtectionPolicy({ onRequestReview }: { onRequestReview: () => void }) {
  return (
    <div className="page policy-page">
      <h1>What GRAPES Blocks (and What It Doesn't)</h1>
      <p className="page-desc">
        GRAPES is designed to stop surveillance — not break the web. We draw a clear line
        between services that track users for profit and services that keep websites running.
      </p>

      {/* ---- Principles ---- */}
      <div className="section">
        <h2>Our Principles</h2>
        <div className="policy-principles">
          <div className="policy-principle">
            <div className="policy-principle-num">1</div>
            <div>
              <strong>Block surveillance, not functionality.</strong> Ad trackers, retargeting pixels,
              and behavioral profilers are blocked. Error monitors, support widgets, and log
              tools are allowed.
            </div>
          </div>
          <div className="policy-principle">
            <div className="policy-principle-num">2</div>
            <div>
              <strong>No collateral damage.</strong> Blocking a site's error reporting doesn't
              protect your privacy — it just makes the site buggier for everyone.
            </div>
          </div>
          <div className="policy-principle">
            <div className="policy-principle-num">3</div>
            <div>
              <strong>Transparent criteria.</strong> Every blocking decision is based on whether
              a service builds cross-site user profiles, sells data to advertisers, or
              tracks users without meaningful consent.
            </div>
          </div>
        </div>
      </div>

      {/* ---- Blocked ---- */}
      <div className="section">
        <h2>Blocked: Surveillance Trackers</h2>
        <p className="policy-section-desc">
          These services exist to profile users across websites for advertising, retargeting,
          or behavioral analytics. GRAPES blocks requests to these domains by default.
        </p>

        <div className="policy-category-grid">
          <div className="policy-category-card policy-blocked">
            <h3>Ad Networks & Retargeting</h3>
            <p>Build cross-site profiles to serve targeted ads. Your browsing history is the product.</p>
            <div className="policy-domains">
              <span>google-analytics.com</span>
              <span>doubleclick.net</span>
              <span>googlesyndication.com</span>
              <span>googleadservices.com</span>
              <span>criteo.com</span>
              <span>outbrain.com</span>
              <span>taboola.com</span>
              <span>amazon-adsystem.com</span>
            </div>
          </div>

          <div className="policy-category-card policy-blocked">
            <h3>Social Media Pixels</h3>
            <p>Track you across every site that embeds their pixel — even if you never click.</p>
            <div className="policy-domains">
              <span>facebook.com/tr</span>
              <span>facebook.net</span>
              <span>analytics.twitter.com</span>
              <span>linkedin.com/px</span>
              <span>analytics.tiktok.com</span>
              <span>ct.pinterest.com</span>
              <span>snap.licdn.com</span>
            </div>
          </div>

          <div className="policy-category-card policy-blocked">
            <h3>Behavioral Analytics</h3>
            <p>Record user-level event streams to build individual profiles of how you use websites.</p>
            <div className="policy-domains">
              <span>segment.io</span>
              <span>mixpanel.com</span>
              <span>amplitude.com</span>
              <span>hubspot.com</span>
              <span>optimizely.com</span>
              <span>chartbeat.com</span>
              <span>scorecardresearch.com</span>
            </div>
          </div>

          <div className="policy-category-card policy-blocked">
            <h3>Microsoft / Bing Tracking</h3>
            <p>Conversion tracking and session recording that feeds into ad targeting.</p>
            <div className="policy-domains">
              <span>bat.bing.com</span>
              <span>clarity.ms</span>
              <span>googletagmanager.com</span>
            </div>
          </div>
        </div>

        <p className="policy-also">
          GRAPES also detects and blocks tracking via URL patterns: <code>/pixel</code>,{' '}
          <code>/beacon</code>, <code>/collect</code>, <code>/track</code>,{' '}
          <code>1x1.gif</code>, and similar pixel endpoints — regardless of domain.
        </p>
      </div>

      {/* ---- Allowed ---- */}
      <div className="section">
        <h2>Allowed: Functional Services</h2>
        <p className="policy-section-desc">
          These services help websites work correctly. They collect application data
          (stack traces, logs, support tickets) — not user profiles. Blocking them hurts
          site reliability without protecting your privacy.
        </p>

        <div className="policy-category-grid">
          <div className="policy-category-card policy-allowed">
            <h3>Error Monitoring</h3>
            <p>Capture crash reports and stack traces so developers can fix bugs. Data is about
              the application, not the user.</p>
            <div className="policy-domains">
              <span>sentry.io</span>
              <span>bugsnag.com</span>
              <span>rollbar.com</span>
            </div>
          </div>

          <div className="policy-category-card policy-allowed">
            <h3>Performance Monitoring</h3>
            <p>Measure page load times and server response. Helps sites stay fast without
              identifying individual users.</p>
            <div className="policy-domains">
              <span>newrelic.com</span>
              <span>nr-data.net</span>
            </div>
          </div>

          <div className="policy-category-card policy-allowed">
            <h3>Log Aggregation</h3>
            <p>Collect server-side logs for debugging. These services process application
              events, not user behavior.</p>
            <div className="policy-domains">
              <span>loggly.com</span>
              <span>sumologic.com</span>
            </div>
          </div>

          <div className="policy-category-card policy-allowed">
            <h3>Customer Support</h3>
            <p>Live chat and help desk tools. They enable direct user-initiated communication,
              not passive surveillance.</p>
            <div className="policy-domains">
              <span>intercom.io</span>
              <span>zendesk.com</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- How we decide ---- */}
      <div className="section">
        <h2>How We Classify a Service</h2>
        <p className="policy-section-desc">
          Every domain goes through the same evaluation. A service is classified as a
          surveillance tracker if it meets any of the following criteria:
        </p>

        <table className="data-table policy-criteria-table">
          <thead>
            <tr>
              <th>Criterion</th>
              <th>Surveillance Tracker</th>
              <th>Functional Service</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Builds cross-site user profiles</td>
              <td className="policy-cell-bad">Yes</td>
              <td className="policy-cell-good">No</td>
            </tr>
            <tr>
              <td>Sells or shares data with ad networks</td>
              <td className="policy-cell-bad">Yes</td>
              <td className="policy-cell-good">No</td>
            </tr>
            <tr>
              <td>Tracks users without meaningful consent</td>
              <td className="policy-cell-bad">Yes</td>
              <td className="policy-cell-good">No</td>
            </tr>
            <tr>
              <td>Primary data collected</td>
              <td className="policy-cell-bad">Browsing behavior, clicks, identity</td>
              <td className="policy-cell-good">Stack traces, logs, support tickets</td>
            </tr>
            <tr>
              <td>Who benefits from the data</td>
              <td className="policy-cell-bad">Advertisers and data brokers</td>
              <td className="policy-cell-good">The site's own engineering team</td>
            </tr>
            <tr>
              <td>Effect of blocking</td>
              <td className="policy-cell-good">User gains privacy</td>
              <td className="policy-cell-bad">Site loses error visibility</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---- Advanced ---- */}
      <div className="section">
        <h2>Advanced: Block Everything</h2>
        <p className="policy-section-desc">
          If you prefer maximum blocking regardless of site breakage, GRAPES provides an
          opt-in <code>blockFunctional</code> setting that also blocks error monitors,
          log aggregators, and support widgets. This is off by default.
        </p>
      </div>

      {/* ---- CTA ---- */}
      <div className="section policy-cta">
        <h2>Is your service miscategorized?</h2>
        <p>
          If you run a functional service that GRAPES is blocking, you can request a review.
          We evaluate every submission against the criteria above and respond via email.
        </p>
        <button type="button" className="review-submit-btn" onClick={onRequestReview}>
          Request Domain Review
        </button>
      </div>
    </div>
  );
}
