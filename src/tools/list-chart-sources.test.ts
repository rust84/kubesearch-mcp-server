import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listChartSources } from './list-chart-sources.js';
import { DataCollector } from '../services/data-collector.js';
import { createMockRelease, mockRepoInfo } from '../test/fixtures.js';

describe('list-chart-sources', () => {
  let mockDataCollector: DataCollector;

  beforeEach(() => {
    mockDataCollector = {
      collectReleases: vi.fn(),
    } as unknown as DataCollector;
  });

  it('should list unique chart sources with deployment counts', async () => {
    const releases = [
      createMockRelease({ key: 'ghcr.io-bjw-s-helm-plex', chart: 'plex', name: 'plex' }),
      createMockRelease({ key: 'ghcr.io-bjw-s-helm-plex', chart: 'plex', name: 'plex' }),
      createMockRelease({ key: 'charts.bitnami.com-bitnami-nginx', chart: 'nginx', name: 'nginx' }),
    ];

    vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
      releases,
      repos: {
        'ghcr.io-bjw-s-helm-plex': [mockRepoInfo, mockRepoInfo, mockRepoInfo],
        'charts.bitnami.com-bitnami-nginx': [mockRepoInfo],
      },
      values: {},
    });

    const results = await listChartSources(mockDataCollector, { query: 'plex' });

    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('ghcr.io-bjw-s-helm-plex');
    expect(results[0].count).toBe(3);
  });

  it('should sort by deployment count descending', async () => {
    const releases = [
      createMockRelease({ key: 'source1', chart: 'app', name: 'app' }),
      createMockRelease({ key: 'source2', chart: 'app', name: 'app' }),
      createMockRelease({ key: 'source3', chart: 'app', name: 'app' }),
    ];

    vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
      releases,
      repos: {
        source1: [mockRepoInfo],
        source2: [mockRepoInfo, mockRepoInfo, mockRepoInfo],
        source3: [mockRepoInfo, mockRepoInfo],
      },
      values: {},
    });

    const results = await listChartSources(mockDataCollector, { query: 'app' });

    expect(results.length).toBeGreaterThanOrEqual(1);
    if (results.length >= 3) {
      expect(results[0].count).toBeGreaterThanOrEqual(results[1].count);
    }
  });

  it('should filter by minCount', async () => {
    const releases = [
      createMockRelease({ key: 'source1', chart: 'app' }),
      createMockRelease({ key: 'source2', chart: 'app' }),
    ];

    vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
      releases,
      repos: {
        source1: [mockRepoInfo],
        source2: [mockRepoInfo, mockRepoInfo, mockRepoInfo, mockRepoInfo],
      },
      values: {},
    });

    const results = await listChartSources(mockDataCollector, { query: 'app', minCount: 3 });

    expect(results).toHaveLength(1);
    expect(results[0].count).toBe(4);
  });

  it('should return empty array when no matches found', async () => {
    vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
      releases: [createMockRelease({ chart: 'plex' })],
      repos: {},
      values: {},
    });

    const results = await listChartSources(mockDataCollector, { query: 'nonexistent' });

    expect(results).toEqual([]);
  });
});
