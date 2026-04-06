import { useState } from 'react';
import { About } from './pages/About';
import { Categories } from './pages/Categories';
import { DomainView } from './pages/DomainView';
import { Leaderboard } from './pages/Leaderboard';
import { Overview } from './pages/Overview';
import { ProtectionPolicy } from './pages/ProtectionPolicy';
import { ReviewRequest } from './pages/ReviewRequest';

type Page =
  | { id: 'overview' }
  | { id: 'leaderboard' }
  | { id: 'categories' }
  | { id: 'domain'; domain: string }
  | { id: 'protection-policy' }
  | { id: 'review-request' }
  | { id: 'about' };

export function App() {
  const [page, setPage] = useState<Page>({ id: 'overview' });

  function navigate(next: Page) {
    setPage(next);
    window.scrollTo(0, 0);
  }

  return (
    <div className="app">
      <nav className="nav" role="navigation" aria-label="Main navigation">
        <div className="nav-brand" onClick={() => navigate({ id: 'overview' })}>
          <span className="nav-logo">🍇</span> GRAPES
        </div>
        <div className="nav-links">
          <button
            type="button"
            className={`nav-link ${page.id === 'overview' ? 'active' : ''}`}
            onClick={() => navigate({ id: 'overview' })}
          >
            Overview
          </button>
          <button
            type="button"
            className={`nav-link ${page.id === 'leaderboard' || page.id === 'domain' ? 'active' : ''}`}
            onClick={() => navigate({ id: 'leaderboard' })}
          >
            Leaderboard
          </button>
          <button
            type="button"
            className={`nav-link ${page.id === 'categories' ? 'active' : ''}`}
            onClick={() => navigate({ id: 'categories' })}
          >
            Categories
          </button>
          <button
            type="button"
            className={`nav-link ${page.id === 'protection-policy' ? 'active' : ''}`}
            onClick={() => navigate({ id: 'protection-policy' })}
          >
            Protection Policy
          </button>
          <button
            type="button"
            className={`nav-link ${page.id === 'review-request' ? 'active' : ''}`}
            onClick={() => navigate({ id: 'review-request' })}
          >
            Request Review
          </button>
          <button
            type="button"
            className={`nav-link ${page.id === 'about' ? 'active' : ''}`}
            onClick={() => navigate({ id: 'about' })}
          >
            About
          </button>
        </div>
      </nav>

      <main className="main">
        {page.id === 'overview' && (
          <Overview onDomainClick={(d) => navigate({ id: 'domain', domain: d })} />
        )}
        {page.id === 'leaderboard' && (
          <Leaderboard onDomainClick={(d) => navigate({ id: 'domain', domain: d })} />
        )}
        {page.id === 'categories' && <Categories />}
        {page.id === 'domain' && (
          <DomainView domain={page.domain} onBack={() => navigate({ id: 'leaderboard' })} />
        )}
        {page.id === 'protection-policy' && (
          <ProtectionPolicy onRequestReview={() => navigate({ id: 'review-request' })} />
        )}
        {page.id === 'review-request' && <ReviewRequest />}
        {page.id === 'about' && <About />}
      </main>

      <footer className="footer">
        <span>GRAPES Web Surveillance Dashboard</span>
        <span>Data contributed by opt-in users of the GRAPES browser extension</span>
      </footer>
    </div>
  );
}
