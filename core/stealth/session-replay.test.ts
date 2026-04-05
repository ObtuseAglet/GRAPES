import { describe, expect, it } from 'vitest';
import { detectSessionReplayTools, SESSION_REPLAY_SIGNATURES } from './session-replay';

describe('detectSessionReplayTools', () => {
  describe('detection via globals', () => {
    it('detects Hotjar via hj global', () => {
      const result = detectSessionReplayTools({ hj: () => {} }, []);
      expect(result).toContain('hotjar');
    });

    it('detects Hotjar via _hjSettings global', () => {
      const result = detectSessionReplayTools({ _hjSettings: {} }, []);
      expect(result).toContain('hotjar');
    });

    it('detects FullStory via FS global', () => {
      const result = detectSessionReplayTools({ FS: {} }, []);
      expect(result).toContain('fullstory');
    });

    it('detects LogRocket via LogRocket global', () => {
      const result = detectSessionReplayTools({ LogRocket: {} }, []);
      expect(result).toContain('logrocket');
    });

    it('detects Mouseflow via mouseflow global', () => {
      const result = detectSessionReplayTools({ mouseflow: {} }, []);
      expect(result).toContain('mouseflow');
    });

    it('detects Mouseflow via _mfq global', () => {
      const result = detectSessionReplayTools({ _mfq: [] }, []);
      expect(result).toContain('mouseflow');
    });

    it('detects Clarity via clarity global', () => {
      const result = detectSessionReplayTools({ clarity: () => {} }, []);
      expect(result).toContain('clarity');
    });

    it('detects Heap via heap global', () => {
      const result = detectSessionReplayTools({ heap: {} }, []);
      expect(result).toContain('heap');
    });

    it('detects Smartlook via smartlook global', () => {
      const result = detectSessionReplayTools({ smartlook: () => {} }, []);
      expect(result).toContain('smartlook');
    });

    it('detects Inspectlet via __insp global', () => {
      const result = detectSessionReplayTools({ __insp: {} }, []);
      expect(result).toContain('inspectlet');
    });

    it('detects Lucky Orange via __lo_site_id global', () => {
      const result = detectSessionReplayTools({ __lo_site_id: 123 }, []);
      expect(result).toContain('lucky_orange');
    });

    it('detects CrazyEgg via CE2 global', () => {
      const result = detectSessionReplayTools({ CE2: {} }, []);
      expect(result).toContain('crazyegg');
    });
  });

  describe('detection via script sources', () => {
    it('detects Hotjar via script src', () => {
      const result = detectSessionReplayTools({}, ['https://static.hotjar.com/c/hotjar-123.js']);
      expect(result).toContain('hotjar');
    });

    it('detects FullStory via script src', () => {
      const result = detectSessionReplayTools({}, ['https://edge.fullstory.com/s/fs.js']);
      expect(result).toContain('fullstory');
    });

    it('detects LogRocket via script src', () => {
      const result = detectSessionReplayTools({}, ['https://cdn.logrocket.io/LogRocket.min.js']);
      expect(result).toContain('logrocket');
    });

    it('detects Clarity via script src', () => {
      const result = detectSessionReplayTools({}, ['https://clarity.ms/tag/abc123']);
      expect(result).toContain('clarity');
    });

    it('detects Heap via script src', () => {
      const result = detectSessionReplayTools({}, ['https://cdn.heapanalytics.com/js/heap-123.js']);
      expect(result).toContain('heap');
    });

    it('detects CrazyEgg via script src', () => {
      const result = detectSessionReplayTools({}, ['https://script.crazyegg.com/pages/scripts/123.js']);
      expect(result).toContain('crazyegg');
    });
  });

  describe('multiple tools', () => {
    it('detects multiple tools at once', () => {
      const result = detectSessionReplayTools(
        { hj: () => {}, clarity: () => {} },
        ['https://cdn.logrocket.io/LogRocket.min.js'],
      );
      expect(result).toContain('hotjar');
      expect(result).toContain('clarity');
      expect(result).toContain('logrocket');
      expect(result).toHaveLength(3);
    });

    it('prefers global detection over script detection', () => {
      // If a tool is found via globals, it shouldn't check scripts for the same tool
      const result = detectSessionReplayTools(
        { hj: () => {} },
        ['https://static.hotjar.com/c/hotjar-123.js'],
      );
      // Should only appear once
      expect(result.filter((t) => t === 'hotjar')).toHaveLength(1);
    });
  });

  describe('no false positives', () => {
    it('returns empty array for clean page', () => {
      const result = detectSessionReplayTools({}, []);
      expect(result).toHaveLength(0);
    });

    it('ignores unrelated globals', () => {
      const result = detectSessionReplayTools(
        { jQuery: () => {}, React: {}, __NEXT_DATA__: {} },
        [],
      );
      expect(result).toHaveLength(0);
    });

    it('ignores unrelated script sources', () => {
      const result = detectSessionReplayTools(
        {},
        [
          'https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js',
          'https://example.com/app.js',
        ],
      );
      expect(result).toHaveLength(0);
    });

    it('does not flag undefined globals', () => {
      // Explicitly passing undefined values should not trigger
      const result = detectSessionReplayTools(
        { hj: undefined, clarity: undefined },
        [],
      );
      expect(result).toHaveLength(0);
    });
  });

  describe('signature completeness', () => {
    it('covers all 10 session replay tools', () => {
      const tools = Object.keys(SESSION_REPLAY_SIGNATURES);
      expect(tools).toHaveLength(10);
      expect(tools).toContain('hotjar');
      expect(tools).toContain('fullstory');
      expect(tools).toContain('logrocket');
      expect(tools).toContain('mouseflow');
      expect(tools).toContain('clarity');
      expect(tools).toContain('heap');
      expect(tools).toContain('smartlook');
      expect(tools).toContain('inspectlet');
      expect(tools).toContain('lucky_orange');
      expect(tools).toContain('crazyegg');
    });

    it('every tool has at least one global signature', () => {
      for (const [tool, sig] of Object.entries(SESSION_REPLAY_SIGNATURES)) {
        expect(sig.globals.length, `${tool} should have globals`).toBeGreaterThan(0);
      }
    });

    it('every tool has at least one script signature', () => {
      for (const [tool, sig] of Object.entries(SESSION_REPLAY_SIGNATURES)) {
        expect(sig.scripts.length, `${tool} should have script sigs`).toBeGreaterThan(0);
      }
    });
  });
});
