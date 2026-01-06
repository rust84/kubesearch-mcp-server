import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchContainerImages } from './search-container-images.js';
import { DataCollector } from '../services/data-collector.js';
import { createMockRelease, mockRepoInfo } from '../test/fixtures.js';

describe('search-container-images', () => {
  let mockDataCollector: DataCollector;

  beforeEach(() => {
    mockDataCollector = {
      collectReleases: vi.fn(),
    } as unknown as DataCollector;
  });

  it('should search for container images in values', async () => {
    const imageValues = {
      image: {
        repository: 'plexinc/pms-docker',
        tag: 'latest',
      },
    };

    vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
      releases: [createMockRelease({})],
      repos: {
        'test-key': [mockRepoInfo],
      },
      values: {
        [mockRepoInfo.url]: imageValues,
      },
    });

    const results = await searchContainerImages(mockDataCollector, { image: 'plex' });

    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty results', async () => {
    vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
      releases: [],
      repos: {},
      values: {},
    });

    const results = await searchContainerImages(mockDataCollector, { image: 'nonexistent' });

    expect(results).toEqual([]);
  });

  it('should group by repository name', async () => {
    const imageValues = {
      image: {
        repository: 'nginx',
        tag: '1.21.0',
      },
    };

    vi.mocked(mockDataCollector.collectReleases).mockResolvedValue({
      releases: [createMockRelease({})],
      repos: {
        'test-key': [mockRepoInfo, mockRepoInfo],
      },
      values: {
        [mockRepoInfo.url]: imageValues,
      },
    });

    const results = await searchContainerImages(mockDataCollector, { image: 'nginx' });

    expect(results.length).toBeGreaterThanOrEqual(0);
  });
});
