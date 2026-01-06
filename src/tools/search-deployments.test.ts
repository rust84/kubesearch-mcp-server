import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchDeployments } from './search-deployments.js';
import { DataCollector } from '../services/data-collector.js';
import { mockReleaseInfo, mockReleaseInfo2, createMockRelease } from '../test/fixtures.js';

describe('search-deployments', () => {
  let mockDataCollector: DataCollector;

  beforeEach(() => {
    mockDataCollector = {
      collectReleases: vi.fn(),
    } as unknown as DataCollector;
  });

  describe('searchDeployments', () => {
    it('should return deployments matching exact query', async () => {
      const mockCollectorData = {
        releases: [mockReleaseInfo, mockReleaseInfo2],
        repos: {},
        values: {},
      };

      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue(mockCollectorData);

      const results = await searchDeployments(mockDataCollector, {
        query: 'plex',
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('plex');
      expect(results[0].chart).toBe('plex');
    });

    it('should return deployments matching partial query', async () => {
      const mockCollectorData = {
        releases: [mockReleaseInfo, mockReleaseInfo2],
        repos: {},
        values: {},
      };

      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue(mockCollectorData);

      const results = await searchDeployments(mockDataCollector, {
        query: 'pl',
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('plex');
    });

    it('should respect default limit of 10', async () => {
      const releases = Array.from({ length: 20 }, (_, i) =>
        createMockRelease({
          name: `plex-${i}`,
          chart: `plex-${i}`,
          key: `key-${i}`,
        }),
      );

      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
        releases,
        repos: {},
        values: {},
      });

      const results = await searchDeployments(mockDataCollector, {
        query: 'plex',
      });

      expect(results).toHaveLength(10);
    });

    it('should respect custom limit parameter', async () => {
      const releases = Array.from({ length: 20 }, (_, i) =>
        createMockRelease({
          name: `plex-${i}`,
          chart: `plex-${i}`,
          key: `key-${i}`,
        }),
      );

      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
        releases,
        repos: {},
        values: {},
      });

      const results = await searchDeployments(mockDataCollector, {
        query: 'plex',
        limit: 5,
      });

      expect(results).toHaveLength(5);
    });

    it('should enforce max limit of 100', async () => {
      const releases = Array.from({ length: 150 }, (_, i) =>
        createMockRelease({
          name: `plex-${i}`,
          chart: `plex-${i}`,
          key: `key-${i}`,
        }),
      );

      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
        releases,
        repos: {},
        values: {},
      });

      const results = await searchDeployments(mockDataCollector, {
        query: 'plex',
        limit: 200,
      });

      expect(results).toHaveLength(100);
    });

    it('should sort results by score (descending)', async () => {
      const releases = [
        createMockRelease({ name: 'plex-long-name', stars: 50 }),
        createMockRelease({ name: 'plex', stars: 100 }),
        createMockRelease({ name: 'plex-medium', stars: 75 }),
      ];

      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
        releases,
        repos: {},
        values: {},
      });

      const results = await searchDeployments(mockDataCollector, {
        query: 'plex',
      });

      expect(results[0].name).toBe('plex'); // Exact match + highest stars
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('should apply author weights correctly', async () => {
      const releases = [
        createMockRelease({
          name: 'plex',
          repo: 'preferred-author/cluster',
          stars: 100,
        }),
        createMockRelease({ name: 'plex', repo: 'user/repo', stars: 150 }),
      ];

      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
        releases,
        repos: {},
        values: {},
      });

      const authorWeights = { 'preferred-author': 2.0 };
      const results = await searchDeployments(mockDataCollector, { query: 'plex' }, authorWeights);

      // preferred-author should rank higher due to 2x weight despite lower stars
      expect(results[0].repo).toBe('preferred-author/cluster');
    });

    it('should return empty array when no matches found', async () => {
      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
        releases: [mockReleaseInfo],
        repos: {},
        values: {},
      });

      const results = await searchDeployments(mockDataCollector, {
        query: 'nonexistent',
      });

      expect(results).toEqual([]);
    });

    it('should round score to 1 decimal place', async () => {
      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
        releases: [mockReleaseInfo],
        repos: {},
        values: {},
      });

      const results = await searchDeployments(mockDataCollector, {
        query: 'plex',
      });

      expect(results[0].score).toBe(Math.round(results[0].score * 10) / 10);
    });

    it('should include all required fields in results', async () => {
      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
        releases: [mockReleaseInfo],
        repos: {},
        values: {},
      });

      const results = await searchDeployments(mockDataCollector, {
        query: 'plex',
      });

      expect(results[0]).toHaveProperty('name');
      expect(results[0]).toHaveProperty('chart');
      expect(results[0]).toHaveProperty('helmRepoURL');
      expect(results[0]).toHaveProperty('repo');
      expect(results[0]).toHaveProperty('repoUrl');
      expect(results[0]).toHaveProperty('stars');
      expect(results[0]).toHaveProperty('version');
      expect(results[0]).toHaveProperty('deploymentUrl');
      expect(results[0]).toHaveProperty('key');
      expect(results[0]).toHaveProperty('score');
    });

    it('should handle case-insensitive queries', async () => {
      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
        releases: [mockReleaseInfo],
        repos: {},
        values: {},
      });

      const results = await searchDeployments(mockDataCollector, {
        query: 'PLEX',
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('plex');
    });
  });
});
