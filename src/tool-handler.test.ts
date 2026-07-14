import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleToolCall } from './tool-handler.js';
import { DataCollector } from './services/data-collector.js';
import { createMockRelease, createMockRepoInfo } from './test/fixtures.js';

describe('tool-handler', () => {
  let mockDataCollector: DataCollector;

  beforeEach(() => {
    mockDataCollector = {
      collectReleases: vi.fn(),
      collectValues: vi.fn(),
      collectAllValues: vi.fn(),
    } as unknown as DataCollector;
  });

  describe('handleToolCall', () => {
    it('routes search_deployments to the search tool and returns parseable JSON text', async () => {
      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
        releases: [],
        repos: {},
      });

      const result = await handleToolCall(mockDataCollector, {}, 'search_deployments', {
        query: 'plex',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual([]);
    });

    it('routes get_chart_details and surfaces the not-found error for an unknown key', async () => {
      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
        releases: [],
        repos: {},
      });

      const result = await handleToolCall(mockDataCollector, {}, 'get_chart_details', {
        key: 'bogus',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Chart with key 'bogus' not found");
    });

    it('routes get_chart_index and surfaces the not-found error for an unknown key', async () => {
      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
        releases: [],
        repos: {},
      });

      const result = await handleToolCall(mockDataCollector, {}, 'get_chart_index', {
        key: 'bogus',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Chart with key 'bogus' not found");
    });

    it('routes get_chart_stats and surfaces the not-found error for an unknown key', async () => {
      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
        releases: [],
        repos: {},
      });

      const result = await handleToolCall(mockDataCollector, {}, 'get_chart_stats', {
        key: 'bogus',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("No repositories found for chart key: 'bogus'");
    });

    it('routes list_chart_sources without throwing', async () => {
      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
        releases: [],
        repos: {},
      });

      const result = await handleToolCall(mockDataCollector, {}, 'list_chart_sources', {
        query: 'plex',
      });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual([]);
    });

    it('routes search_container_images without throwing', async () => {
      vi.mocked(mockDataCollector.collectAllValues).mockResolvedValue({});

      const result = await handleToolCall(mockDataCollector, {}, 'search_container_images', {
        image: 'ghcr.io/linuxserver/plex',
      });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual([]);
    });

    it('returns an error envelope for an unknown tool name', async () => {
      const result = await handleToolCall(mockDataCollector, {}, 'bogus', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: Unknown tool: bogus');
    });

    it('returns an error envelope when a tool throws', async () => {
      vi.mocked(mockDataCollector.collectReleases).mockRejectedValue(new Error('boom'));

      const result = await handleToolCall(mockDataCollector, {}, 'search_deployments', {
        query: 'plex',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: boom');
    });

    it('returns a validation error envelope for search_deployments when query is missing', async () => {
      const result = await handleToolCall(mockDataCollector, {}, 'search_deployments', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid arguments for search_deployments');
    });

    it('treats a negative limit as the default limit of 10 for search_deployments (not an error)', async () => {
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
      });

      const result = await handleToolCall(mockDataCollector, {}, 'search_deployments', {
        query: 'plex',
        limit: -5,
      });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toHaveLength(10);
    });

    it('treats an out-of-range limit as the default limit of 20 for search_container_images (not an error)', async () => {
      const imageValues: Record<string, { image: { repository: string; tag: string } }> = {};
      for (let i = 0; i < 30; i++) {
        imageValues[`https://github.com/user/repo${i}`] = {
          image: { repository: `ghcr.io/linuxserver/plex-${i}`, tag: 'latest' },
        };
      }

      vi.mocked(mockDataCollector.collectAllValues).mockResolvedValue(imageValues);

      const result = await handleToolCall(mockDataCollector, {}, 'search_container_images', {
        image: 'plex',
        limit: 999999,
      });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toHaveLength(20);
    });

    it('treats an out-of-range valuesLimit as the default of 5 for get_chart_details (not an error)', async () => {
      const repos = Array.from({ length: 8 }, (_, i) =>
        createMockRepoInfo({
          url: `https://example.com/${i}`,
          repo: `user${i}/repo`,
          repo_url: `https://github.com/user${i}/repo`,
          stars: i,
        }),
      );

      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
        releases: [createMockRelease({ key: 'k' })],
        repos: { k: repos },
      });
      vi.mocked(mockDataCollector.collectValues).mockResolvedValue(
        Object.fromEntries(repos.map((r) => [r.url, { image: { repository: 'plex' } }])),
      );

      const result = await handleToolCall(mockDataCollector, {}, 'get_chart_details', {
        key: 'k',
        valuesLimit: 99,
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      const imagePath = parsed.popularValues.find(
        (p: { path: string }) => p.path === 'image.repository',
      );
      expect(imagePath.values).toHaveLength(5);
    });
  });
});
