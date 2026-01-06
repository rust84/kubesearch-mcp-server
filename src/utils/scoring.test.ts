import { describe, it, expect } from 'vitest';
import { calculateScore, simplifyURL, matchesQuery } from './scoring.js';
import { SEARCH_WEIGHTS } from '../types/kubesearch.js';
import {
  mockReleaseInfo,
  mockReleaseInfo2,
  mockReleaseInfoDifferentNames,
  mockReleaseInfoHighStars,
  createMockRelease,
} from '../test/fixtures.js';

describe('scoring utilities', () => {
  describe('calculateScore', () => {
    describe('exact matches', () => {
      it('should give full match score for exact release name match', () => {
        const score = calculateScore(mockReleaseInfo, 'plex');
        const expectedMinScore = SEARCH_WEIGHTS.fullMatch + (mockReleaseInfo.stars * SEARCH_WEIGHTS.stars);
        expect(score).toBeGreaterThanOrEqual(expectedMinScore);
      });

      it('should give full match score for exact chart name match', () => {
        const release = createMockRelease({ name: 'my-plex', chart: 'plex' });
        const score = calculateScore(release, 'plex');
        expect(score).toBeGreaterThanOrEqual(SEARCH_WEIGHTS.fullMatch);
      });

      it('should be case insensitive', () => {
        const score1 = calculateScore(mockReleaseInfo, 'PLEX');
        const score2 = calculateScore(mockReleaseInfo, 'plex');
        expect(score1).toBe(score2);
      });

      it('should prioritize exact match over stars', () => {
        const lowStarExactMatch = createMockRelease({ name: 'nginx', stars: 10 });
        const highStarPartialMatch = createMockRelease({ name: 'nginx-ingress', stars: 1000 });

        const exactScore = calculateScore(lowStarExactMatch, 'nginx');
        const partialScore = calculateScore(highStarPartialMatch, 'nginx');

        expect(exactScore).toBeGreaterThan(partialScore);
      });
    });

    describe('length scoring', () => {
      it('should penalize longer names', () => {
        const shortRelease = createMockRelease({ name: 'plex', stars: 0 });
        const longRelease = createMockRelease({ name: 'plex-media-server', stars: 0 });

        const shortScore = calculateScore(shortRelease, 'plex', {});
        const longScore = calculateScore(longRelease, 'plex', {});

        expect(shortScore).toBeGreaterThan(longScore);
      });

      it('should calculate length penalty correctly', () => {
        const release = createMockRelease({ name: 'plex-server', chart: 'other', stars: 0 });
        const query = 'plex';
        const score = calculateScore(release, query, {});

        // score = fullMatch(0) - length_diff * 1 + stars(0)
        // name.length(11) - query.length(4) = 7
        const expectedScore = 0 - 7;
        expect(score).toBe(expectedScore);
      });

      it('should favor shorter names when query is shorter', () => {
        const short = createMockRelease({ name: 'app', chart: 'other', stars: 0 });
        const long = createMockRelease({ name: 'application', chart: 'other', stars: 0 });

        const shortScore = calculateScore(short, 'a', {});
        const longScore = calculateScore(long, 'a', {});

        expect(shortScore).toBeGreaterThan(longScore);
      });
    });

    describe('stars scoring', () => {
      it('should add score based on stars count', () => {
        const release1 = createMockRelease({ name: 'other', chart: 'other', stars: 100 });
        const release2 = createMockRelease({ name: 'other', chart: 'other', stars: 200 });

        const score1 = calculateScore(release1, 'query', {});
        const score2 = calculateScore(release2, 'query', {});

        expect(score2 - score1).toBe(10); // 100 stars diff * 0.1 weight
      });

      it('should handle zero stars gracefully', () => {
        const release = createMockRelease({ stars: 0 });
        const score = calculateScore(release, 'plex');
        expect(score).toBeGreaterThan(0); // Still has fullMatch score
      });

      it('should handle very high star counts', () => {
        const release = createMockRelease({ stars: 10000 });
        const score = calculateScore(release, 'plex');
        const starsContribution = 10000 * SEARCH_WEIGHTS.stars;
        expect(score).toBeGreaterThanOrEqual(SEARCH_WEIGHTS.fullMatch + starsContribution);
      });
    });

    describe('author weights', () => {
      it('should multiply score by author weight when author matches', () => {
        const authorWeights = { 'testuser': 1.5 };
        const scoreWithWeight = calculateScore(mockReleaseInfo, 'plex', authorWeights);
        const scoreWithoutWeight = calculateScore(mockReleaseInfo, 'plex', {});

        expect(scoreWithWeight).toBe(scoreWithoutWeight * 1.5);
      });

      it('should not apply weight for non-matching authors', () => {
        const authorWeights = { 'otheruser': 1.5 };
        const scoreWithWeight = calculateScore(mockReleaseInfo, 'plex', authorWeights);
        const scoreWithoutWeight = calculateScore(mockReleaseInfo, 'plex', {});

        expect(scoreWithWeight).toBe(scoreWithoutWeight);
      });

      it('should be case insensitive for author matching', () => {
        const release1 = createMockRelease({ repo: 'testuser/cluster' });
        const release2 = createMockRelease({ repo: 'TESTUSER/cluster' });
        const authorWeights = { 'testuser': 1.5 };

        const score1 = calculateScore(release1, 'plex', authorWeights);
        const score2 = calculateScore(release2, 'plex', authorWeights);

        expect(score1).toBe(score2);
      });

      it('should work with empty author weights', () => {
        const score = calculateScore(mockReleaseInfo, 'plex', {});
        expect(score).toBeDefined();
        expect(typeof score).toBe('number');
      });

      it('should handle multiple authors with different weights', () => {
        const authorWeights = {
          'author1': 1.5,
          'author2': 2.0,
          'author3': 1.2,
        };

        const release1 = createMockRelease({ repo: 'author1/cluster', stars: 100 });
        const release2 = createMockRelease({ repo: 'author2/repo', stars: 100 });
        const release3 = createMockRelease({ repo: 'author3/repo', stars: 100 });

        const baseScore = calculateScore(
          createMockRelease({ repo: 'other/repo', stars: 100 }),
          'plex',
          {}
        );

        const score1 = calculateScore(release1, 'plex', authorWeights);
        const score2 = calculateScore(release2, 'plex', authorWeights);
        const score3 = calculateScore(release3, 'plex', authorWeights);

        expect(score1).toBe(baseScore * 1.5);
        expect(score2).toBe(baseScore * 2.0);
        expect(score3).toBe(baseScore * 1.2);
      });

      it('should not apply weight when author weights object is empty', () => {
        const release = createMockRelease({ repo: 'testuser/cluster' });
        const score = calculateScore(release, 'plex', {});
        const baseScore = SEARCH_WEIGHTS.fullMatch + (release.stars * SEARCH_WEIGHTS.stars);
        expect(score).toBe(baseScore);
      });
    });

    describe('edge cases', () => {
      it('should handle empty query', () => {
        const score = calculateScore(mockReleaseInfo, '');
        expect(score).toBeDefined();
        expect(typeof score).toBe('number');
      });

      it('should handle empty release name', () => {
        const release = createMockRelease({ name: '', chart: '' });
        const score = calculateScore(release, 'plex');
        expect(score).toBeDefined();
      });

      it('should handle very long query', () => {
        const longQuery = 'a'.repeat(1000);
        const score = calculateScore(mockReleaseInfo, longQuery);
        expect(score).toBeDefined();
      });

      it('should handle special characters in query', () => {
        const release = createMockRelease({ name: 'app-v1.0', chart: 'app-v1.0' });
        const score = calculateScore(release, 'app-v1.0');
        expect(score).toBeGreaterThanOrEqual(SEARCH_WEIGHTS.fullMatch);
      });

      it('should handle unicode characters', () => {
        const release = createMockRelease({ name: 'app-测试', chart: 'app-测试' });
        const score = calculateScore(release, 'app-测试');
        expect(score).toBeGreaterThanOrEqual(SEARCH_WEIGHTS.fullMatch);
      });
    });

    describe('combined scoring scenarios', () => {
      it('should correctly calculate score for partial match with stars', () => {
        const release = createMockRelease({ name: 'nginx-ingress', chart: 'other', stars: 100 });
        const score = calculateScore(release, 'nginx', {});

        // No fullMatch, length penalty = 13 - 5 = 8, stars = 100 * 0.1 = 10
        const expectedScore = 0 - 8 + 10;
        expect(score).toBe(expectedScore);
      });

      it('should correctly calculate score with all factors', () => {
        const release = createMockRelease({
          name: 'plex',
          chart: 'plex',
          stars: 200,
          repo: 'testuser/cluster',
        });
        const authorWeights = { 'testuser': 1.5 };
        const score = calculateScore(release, 'plex', authorWeights);

        // Base score: fullMatch(100) - length(0) + stars(20) = 120
        // With author weight: 120 * 1.5 = 180
        const expectedScore = (SEARCH_WEIGHTS.fullMatch + (200 * SEARCH_WEIGHTS.stars)) * 1.5;
        expect(score).toBe(expectedScore);
      });
    });
  });

  describe('simplifyURL', () => {
    it('should remove https://', () => {
      expect(simplifyURL('https://charts.example.com/')).toBe('charts.example.com');
    });

    it('should remove http://', () => {
      expect(simplifyURL('http://charts.example.com/')).toBe('charts.example.com');
    });

    it('should remove oci://', () => {
      expect(simplifyURL('oci://ghcr.io/bjw-s/helm/')).toBe('ghcr.io/bjw-s/helm');
    });

    it('should remove trailing slash', () => {
      expect(simplifyURL('charts.example.com/')).toBe('charts.example.com');
    });

    it('should handle combined transformations', () => {
      expect(simplifyURL('https://charts.example.com/')).toBe('charts.example.com');
      expect(simplifyURL('oci://ghcr.io/bjw-s/helm/')).toBe('ghcr.io/bjw-s/helm');
    });

    it('should handle already simplified URLs', () => {
      expect(simplifyURL('charts.example.com')).toBe('charts.example.com');
    });

    it('should handle empty string', () => {
      expect(simplifyURL('')).toBe('');
    });

    it('should not remove protocols from middle of URL', () => {
      expect(simplifyURL('example.com/https://other.com')).toBe('example.com/other.com');
    });

    it('should handle URLs without trailing slash', () => {
      expect(simplifyURL('https://charts.example.com')).toBe('charts.example.com');
    });

    it('should handle multiple trailing slashes', () => {
      expect(simplifyURL('https://charts.example.com///')).toBe('charts.example.com//');
    });
  });

  describe('matchesQuery', () => {
    it('should match on chart name', () => {
      expect(matchesQuery(mockReleaseInfo, 'plex')).toBe(true);
    });

    it('should match on release name', () => {
      const release = createMockRelease({ release: 'my-plex-release', chart: 'other' });
      expect(matchesQuery(release, 'plex')).toBe(true);
    });

    it('should match on simplified chartsUrl', () => {
      expect(matchesQuery(mockReleaseInfo, 'ghcr.io')).toBe(true);
      expect(matchesQuery(mockReleaseInfo, 'test')).toBe(true); // matches 'test' in chartsUrl path
    });

    it('should be case insensitive', () => {
      expect(matchesQuery(mockReleaseInfo, 'PLEX')).toBe(true);
      expect(matchesQuery(mockReleaseInfo, 'Plex')).toBe(true);
    });

    it('should return false for non-matching query', () => {
      expect(matchesQuery(mockReleaseInfo, 'nginx')).toBe(false);
      expect(matchesQuery(mockReleaseInfo, 'xyz')).toBe(false);
    });

    it('should handle partial matches', () => {
      expect(matchesQuery(mockReleaseInfo, 'ple')).toBe(true);
      expect(matchesQuery(mockReleaseInfo, 'ex')).toBe(true);
    });

    it('should handle empty query', () => {
      expect(matchesQuery(mockReleaseInfo, '')).toBe(true);
    });

    it('should match on URL without protocol', () => {
      const release = createMockRelease({ chartsUrl: 'https://charts.bitnami.com/bitnami/' });
      expect(matchesQuery(release, 'charts.bitnami.com')).toBe(true);
      expect(matchesQuery(release, 'bitnami')).toBe(true);
    });

    it('should not match unrelated terms', () => {
      expect(matchesQuery(mockReleaseInfo, 'kubernetes')).toBe(false);
      expect(matchesQuery(mockReleaseInfo, 'docker')).toBe(false);
    });

    it('should match special characters in query', () => {
      const release = createMockRelease({ chart: 'app-v1.0' });
      expect(matchesQuery(release, 'app-v1')).toBe(true);
      expect(matchesQuery(release, 'v1.0')).toBe(true);
    });
  });
});
