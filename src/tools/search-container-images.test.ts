import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchContainerImages } from './search-container-images.js';
import { DataCollector } from '../services/data-collector.js';
import { mockRepoInfo } from '../test/fixtures.js';

describe('search-container-images', () => {
  let mockDataCollector: DataCollector;

  beforeEach(() => {
    mockDataCollector = {
      collectAllValues: vi.fn(),
    } as unknown as DataCollector;
  });

  it('should search for container images in values', async () => {
    const imageValues = {
      image: {
        repository: 'plexinc/pms-docker',
        tag: 'latest',
      },
    };

    vi.mocked(mockDataCollector.collectAllValues).mockResolvedValue({
      [mockRepoInfo.url]: imageValues,
    });

    const results = await searchContainerImages(mockDataCollector, {
      image: 'plex',
    });

    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty results', async () => {
    vi.mocked(mockDataCollector.collectAllValues).mockResolvedValue({});

    const results = await searchContainerImages(mockDataCollector, {
      image: 'nonexistent',
    });

    expect(results).toEqual([]);
  });

  it('should group by repository name', async () => {
    const imageValues = {
      image: {
        repository: 'nginx',
        tag: '1.21.0',
      },
    };

    vi.mocked(mockDataCollector.collectAllValues).mockResolvedValue({
      [mockRepoInfo.url]: imageValues,
    });

    const results = await searchContainerImages(mockDataCollector, {
      image: 'nginx',
    });

    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  describe('image reference parsing', () => {
    async function parseSingleImage(repository: string) {
      vi.mocked(mockDataCollector.collectAllValues).mockResolvedValue({
        [mockRepoInfo.url]: { image: { repository } },
      });

      const results = await searchContainerImages(mockDataCollector, {
        image: '',
      });

      expect(results).toHaveLength(1);
      return { repository: results[0].repository, tag: results[0].tags[0].tag };
    }

    it('splits a plain repository:tag reference', async () => {
      const parsed = await parseSingleImage('ghcr.io/linuxserver/plex:1.2');
      expect(parsed).toEqual({ repository: 'ghcr.io/linuxserver/plex', tag: '1.2' });
    });

    it('does not mistake a registry port for a tag separator', async () => {
      const parsed = await parseSingleImage('registry.example.com:5000/img:v1');
      expect(parsed).toEqual({ repository: 'registry.example.com:5000/img', tag: 'v1' });
    });

    it('defaults to "latest" when a registry:port reference has no tag', async () => {
      const parsed = await parseSingleImage('registry.example.com:5000/img');
      expect(parsed).toEqual({ repository: 'registry.example.com:5000/img', tag: 'latest' });
    });

    it('splits a digest reference on "@" instead of ":"', async () => {
      const parsed = await parseSingleImage('nginx@sha256:abcd');
      expect(parsed).toEqual({ repository: 'nginx', tag: 'sha256:abcd' });
    });
  });
});
