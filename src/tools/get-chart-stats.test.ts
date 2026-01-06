import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getChartStats } from './get-chart-stats.js';
import { DataCollector } from '../services/data-collector.js';
import { createMockRelease, createMockRepoInfo } from '../test/fixtures.js';

describe('get-chart-stats', () => {
  let mockDataCollector: DataCollector;

  beforeEach(() => {
    mockDataCollector = {
      collectReleases: vi.fn(),
    } as unknown as DataCollector;
  });

  it('should return statistics for valid key', async () => {
    const releases = [createMockRelease({ key: 'test-key', stars: 100, version: '1.0.0' })];

    vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
      releases,
      repos: {
        'test-key': [
          createMockRepoInfo({ stars: 100, chart_version: '1.0.0' }),
          createMockRepoInfo({ stars: 150, chart_version: '2.0.0' }),
        ],
      },
      values: {},
    });

    const result = await getChartStats(mockDataCollector, { key: 'test-key' });

    expect(result.statistics.totalDeployments).toBe(2);
    expect(result.statistics.minStars).toBe(100);
    expect(result.statistics.maxStars).toBe(150);
    expect(result.statistics.latestVersion).toBeDefined();
  });

  it('should throw error for invalid key', async () => {
    vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
      releases: [],
      repos: {},
      values: {},
    });

    await expect(getChartStats(mockDataCollector, { key: 'invalid' })).rejects.toThrow();
  });
});
