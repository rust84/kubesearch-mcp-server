import { describe, it, expect } from 'vitest';
import { compareVersions, latestVersion } from './semver.js';

describe('semver', () => {
  describe('latestVersion', () => {
    it('picks the numerically greater patch version', () => {
      expect(latestVersion(['1.2.10', '1.2.9'])).toBe('1.2.10');
    });

    it('compares major versions numerically, not lexically', () => {
      expect(latestVersion(['4.5.0', '10.0.0'])).toBe('10.0.0');
    });

    it('treats a pre-release as lower precedence than the same core version', () => {
      // Per semver precedence rules: 1.0.0-beta.1 < 1.0.0
      expect(latestVersion(['1.0.0-beta.1', '1.0.0'])).toBe('1.0.0');
    });

    it('returns "unknown" for an empty list', () => {
      expect(latestVersion([])).toBe('unknown');
    });

    it('does not throw on non-semver strings', () => {
      expect(() => latestVersion(['latest', 'v1.2'])).not.toThrow();
      expect(() => latestVersion(['latest'])).not.toThrow();
    });
  });

  describe('compareVersions', () => {
    it('returns 0 for equal versions', () => {
      expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
    });

    it('treats missing segments as 0', () => {
      expect(compareVersions('1.2', '1.2.0')).toBe(0);
      expect(compareVersions('1.3', '1.2.9')).toBeGreaterThan(0);
    });
  });
});
