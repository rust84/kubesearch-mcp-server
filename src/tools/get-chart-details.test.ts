import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getChartDetails } from './get-chart-details.js';
import { DataCollector } from '../services/data-collector.js';
import { createMockRelease, mockRepoInfo, mockValueTree } from '../test/fixtures.js';

describe('get-chart-details', () => {
  let mockDataCollector: DataCollector;

  beforeEach(() => {
    mockDataCollector = {
      collectReleases: vi.fn(),
      collectValues: vi.fn(),
    } as unknown as DataCollector;
  });

  it('should return chart details for valid key', async () => {
    const releases = [createMockRelease({ key: 'test-key', chart: 'plex' })];

    vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
      releases,
      repos: {
        'test-key': [mockRepoInfo, mockRepoInfo],
      },
    });
    vi.mocked(mockDataCollector.collectValues).mockResolvedValue({
      url1: mockValueTree,
    });

    const result = await getChartDetails(mockDataCollector, {
      key: 'test-key',
      includeValues: false,
    });

    expect(result.chartName).toBe('plex');
    expect(result.statistics.totalRepos).toBe(2);
  });

  it('should include popular values when includeValues is true', async () => {
    const releases = [createMockRelease({ key: 'test-key' })];

    vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
      releases,
      repos: {
        'test-key': [mockRepoInfo],
      },
    });
    vi.mocked(mockDataCollector.collectValues).mockResolvedValue({
      [mockRepoInfo.url]: mockValueTree,
    });

    const result = await getChartDetails(mockDataCollector, {
      key: 'test-key',
      includeValues: true,
    });

    expect(result.popularValues).toBeDefined();
    expect(mockDataCollector.collectValues).toHaveBeenCalledWith([mockRepoInfo.url]);
  });

  it('should throw error for invalid key', async () => {
    vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
      releases: [],
      repos: {},
    });

    await expect(
      getChartDetails(mockDataCollector, {
        key: 'invalid',
        includeValues: false,
      }),
    ).rejects.toThrow();
  });
});
