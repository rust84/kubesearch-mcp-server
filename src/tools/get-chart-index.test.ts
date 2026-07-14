import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getChartIndex } from './get-chart-index.js';
import { DataCollector } from '../services/data-collector.js';
import { createMockRelease, mockRepoInfo, mockValueTree } from '../test/fixtures.js';

describe('get-chart-index', () => {
  let mockDataCollector: DataCollector;

  beforeEach(() => {
    mockDataCollector = {
      collectReleases: vi.fn(),
      collectValues: vi.fn(),
    } as unknown as DataCollector;
  });

  it('should return result for valid key', async () => {
    const releases = [createMockRelease({ key: 'test-key' })];

    vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
      releases,
      repos: {
        'test-key': [mockRepoInfo, mockRepoInfo],
      },
    });
    vi.mocked(mockDataCollector.collectValues).mockResolvedValue({
      [mockRepoInfo.url]: mockValueTree,
    });

    const result = await getChartIndex(mockDataCollector, { key: 'test-key' });

    expect(result).toBeDefined();
    expect(result.totalDeployments).toBe(2);
    expect(mockDataCollector.collectValues).toHaveBeenCalledWith([
      mockRepoInfo.url,
      mockRepoInfo.url,
    ]);
  });

  it('should throw error for invalid key', async () => {
    vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
      releases: [],
      repos: {},
    });

    await expect(getChartIndex(mockDataCollector, { key: 'invalid' })).rejects.toThrow();
  });
});
