import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleToolCall } from './tool-handler.js';
import { DataCollector } from './services/data-collector.js';

describe('tool-handler', () => {
  let mockDataCollector: DataCollector;

  beforeEach(() => {
    mockDataCollector = {
      collectReleases: vi.fn(),
      collectValues: vi.fn(),
    } as unknown as DataCollector;
  });

  describe('handleToolCall', () => {
    it('routes search_deployments to the search tool and returns parseable JSON text', async () => {
      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
        releases: [],
        repos: {},
        values: {},
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
        values: {},
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
        values: {},
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
        values: {},
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
        values: {},
      });

      const result = await handleToolCall(mockDataCollector, {}, 'list_chart_sources', {
        query: 'plex',
      });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual([]);
    });

    it('routes search_container_images without throwing', async () => {
      vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
        releases: [],
        repos: {},
        values: {},
      });

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
  });
});
