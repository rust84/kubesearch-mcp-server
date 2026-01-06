import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataCollector, mergeHelmURL, releaseKey } from './data-collector.js';
import { DatabaseManager } from './database.js';
import type { FluxHelmReleaseRow, ValuesRow } from '../types/kubesearch.js';
import { mockValueTree, mockSimpleValueTree } from '../test/fixtures.js';

describe('DataCollector', () => {
  describe('mergeHelmURL', () => {
    it('should map helm-charts HTTP URL to OCI', () => {
      expect(mergeHelmURL('https://bjw-s.github.io/helm-charts/')).toBe(
        'oci://ghcr.io/bjw-s/helm/'
      );
    });

    it('should map bitnami URL to OCI', () => {
      expect(mergeHelmURL('https://charts.bitnami.com/bitnami/')).toBe(
        'oci://registry-1.docker.io/bitnamicharts/'
      );
    });

    it('should map prometheus URL to OCI', () => {
      expect(mergeHelmURL('https://prometheus-community.github.io/helm-charts/')).toBe(
        'oci://ghcr.io/prometheus-community/charts/'
      );
    });

    it('should map kyverno URL to OCI', () => {
      expect(mergeHelmURL('https://kyverno.github.io/kyverno/')).toBe(
        'oci://ghcr.io/kyverno/charts/'
      );
    });

    it('should map grafana URL to OCI', () => {
      expect(mergeHelmURL('https://grafana.github.io/helm-charts/')).toBe(
        'oci://ghcr.io/grafana-operator/helm-charts/'
      );
    });

    it('should return unchanged URL when no mapping exists', () => {
      const url = 'https://example.com/charts/';
      expect(mergeHelmURL(url)).toBe(url);
    });

    it('should handle all mappings defined in the mapping object', () => {
      const mappings = [
        ['https://bjw-s.github.io/helm-charts/', 'oci://ghcr.io/bjw-s/helm/'],
        ['https://charts.bitnami.com/bitnami/', 'oci://registry-1.docker.io/bitnamicharts/'],
        [
          'https://github.com/prometheus-community/helm-charts/',
          'oci://ghcr.io/prometheus-community/charts/',
        ],
        [
          'https://prometheus-community.github.io/helm-charts/',
          'oci://ghcr.io/prometheus-community/charts/',
        ],
        [
          'https://actions.github.io/actions-runner-controller/',
          'oci://ghcr.io/actions/actions-runner-controller-charts/',
        ],
        ['https://kyverno.github.io/kyverno/', 'oci://ghcr.io/kyverno/charts/'],
        ['https://grafana.github.io/helm-charts/', 'oci://ghcr.io/grafana-operator/helm-charts/'],
      ];

      mappings.forEach(([input, expected]) => {
        expect(mergeHelmURL(input)).toBe(expected);
      });
    });
  });

  describe('releaseKey', () => {
    describe('OCI URLs', () => {
      it('should handle OCI URL with chart name at end and matching release', () => {
        const key = releaseKey('oci://ghcr.io/bjw-s/helm/plex', 'plex', 'plex');
        expect(key).toBe('ghcr.io-bjw-s-helm-plex');
      });

      it('should append release name when different from chart', () => {
        const key = releaseKey('oci://ghcr.io/bjw-s/helm/plex', 'plex', 'my-plex');
        expect(key).toBe('ghcr.io-bjw-s-helm-plex-my-plex');
      });

      it('should remove oci:// protocol', () => {
        const key = releaseKey('oci://ghcr.io/bjw-s/helm/app', 'app', 'app');
        expect(key).not.toContain('oci://');
      });
    });

    describe('Helm repo URLs', () => {
      it('should handle Helm repo URL with matching chart and release', () => {
        const key = releaseKey('https://charts.bitnami.com/bitnami/', 'nginx', 'nginx');
        expect(key).toBe('charts.bitnami.com-bitnami-nginx');
      });

      it('should append both chart and release when different', () => {
        const key = releaseKey('https://charts.bitnami.com/bitnami/', 'nginx', 'my-nginx');
        expect(key).toBe('charts.bitnami.com-bitnami-nginx-my-nginx');
      });

      it('should remove https:// protocol', () => {
        const key = releaseKey('https://charts.example.com/', 'app', 'app');
        expect(key).not.toContain('https://');
      });

      it('should remove http:// protocol', () => {
        const key = releaseKey('http://charts.example.com/', 'app', 'app');
        expect(key).not.toContain('http://');
      });

      it('should remove trailing slash', () => {
        const key = releaseKey('https://charts.example.com/', 'app', 'app');
        expect(key).toBe('charts.example.com-app');
      });
    });

    describe('sanitization', () => {
      it('should sanitize special characters', () => {
        const key = releaseKey('https://charts.example.com/', 'my@chart!', 'my@chart!');
        expect(key).not.toContain('@');
        expect(key).not.toContain('!');
      });

      it('should replace whitespace with hyphens', () => {
        const key = releaseKey('https://charts.example.com/', 'my chart', 'my chart');
        expect(key).not.toContain(' ');
        expect(key).toContain('-');
      });

      it('should remove leading dots', () => {
        const key = releaseKey('https://charts.example.com/', '.chart', '.chart');
        expect(key).not.toMatch(/^\./);
      });

      it('should convert to lowercase', () => {
        const key = releaseKey('https://Charts.Example.COM/', 'MyChart', 'MyChart');
        expect(key).toBe(key.toLowerCase());
        expect(key).toBe('charts.example.com-mychart');
      });

      it('should handle multiple consecutive special characters', () => {
        const key = releaseKey('https://charts.example.com/', 'app!!!name', 'app!!!name');
        expect(key).not.toContain('!');
      });

      it('should preserve dots within names', () => {
        const key = releaseKey('https://charts.example.com/', 'app.v1.0', 'app.v1.0');
        expect(key).toContain('.');
      });
    });

    describe('edge cases', () => {
      it('should handle empty chart name', () => {
        const key = releaseKey('https://charts.example.com/', '', 'release');
        expect(key).toBeDefined();
        expect(key.length).toBeGreaterThan(0);
      });

      it('should handle chart and release with slashes', () => {
        const key = releaseKey('https://charts.example.com/', 'app/chart', 'app/release');
        expect(key).toContain('-');
      });

      it('should handle complex URL paths', () => {
        const key = releaseKey('https://charts.example.com/path/to/charts/', 'app', 'app');
        expect(key).toBe('charts.example.com-path-to-charts-app');
      });
    });
  });

  describe('DataCollector class', () => {
    let dataCollector: DataCollector;
    let mockDbManager: DatabaseManager;
    let mockDb: any;
    let mockDbExtended: any;

    beforeEach(() => {
      mockDb = {
        all: vi.fn(),
        get: vi.fn(),
      };

      mockDbExtended = {
        all: vi.fn(),
        get: vi.fn(),
      };

      mockDbManager = {
        getDb: vi.fn(() => mockDb),
        getDbExtended: vi.fn(() => mockDbExtended),
      } as unknown as DatabaseManager;

      dataCollector = new DataCollector(mockDbManager);
    });

    describe('collectReleases', () => {
      it('should return releases from Flux HelmRepository', async () => {
        const mockRows: FluxHelmReleaseRow[] = [
          {
            helm_repo_url: 'https://bjw-s.github.io/helm-charts/',
            helm_repo_name: 'bjw-s',
            chart_name: 'plex',
            chart_version: '1.0.0',
            release_name: 'plex',
            url: 'https://github.com/user/repo/blob/main/plex.yaml',
            repo_name: 'user/repo',
            hajimari_icon: 'mdi:plex',
            hajimari_group: 'media',
            timestamp: 1704067200,
            stars: 150,
            repo_url: 'https://github.com/user/repo',
          },
        ];

        mockDb.all.mockResolvedValueOnce(mockRows);
        mockDbExtended.all.mockResolvedValue([]);

        const result = await dataCollector.collectReleases();

        expect(result.releases).toHaveLength(1);
        expect(result.releases[0]).toMatchObject({
          release: 'plex',
          chart: 'plex',
          name: 'plex',
          chartsUrl: 'oci://ghcr.io/bjw-s/helm/', // URL should be merged
          repo: 'user/repo',
          repoUrl: 'https://github.com/user/repo',
          stars: 150,
          version: '1.0.0',
          icon: 'mdi:plex',
        });
      });

      it('should merge URLs correctly', async () => {
        const mockRows: FluxHelmReleaseRow[] = [
          {
            helm_repo_url: 'https://charts.bitnami.com/bitnami/',
            helm_repo_name: 'bitnami',
            chart_name: 'nginx',
            chart_version: '1.0.0',
            release_name: 'nginx',
            url: 'https://github.com/user/repo/blob/main/nginx.yaml',
            repo_name: 'user/repo',
            hajimari_icon: null,
            hajimari_group: null,
            timestamp: 1704067200,
            stars: 50,
            repo_url: 'https://github.com/user/repo',
          },
        ];

        mockDb.all.mockResolvedValueOnce(mockRows);
        mockDbExtended.all.mockResolvedValue([]);

        const result = await dataCollector.collectReleases();

        expect(result.releases[0].chartsUrl).toBe('oci://registry-1.docker.io/bitnamicharts/');
      });

      it('should generate correct release keys', async () => {
        const mockRows: FluxHelmReleaseRow[] = [
          {
            helm_repo_url: 'oci://ghcr.io/bjw-s/helm/',
            helm_repo_name: 'bjw-s',
            chart_name: 'plex',
            chart_version: '1.0.0',
            release_name: 'plex',
            url: 'https://github.com/user/repo/blob/main/plex.yaml',
            repo_name: 'user/repo',
            hajimari_icon: null,
            hajimari_group: null,
            timestamp: 1704067200,
            stars: 100,
            repo_url: 'https://github.com/user/repo',
          },
        ];

        mockDb.all.mockResolvedValueOnce(mockRows);
        mockDbExtended.all.mockResolvedValue([]);

        const result = await dataCollector.collectReleases();

        expect(result.releases[0].key).toBe('ghcr.io-bjw-s-helm-plex');
      });

      it('should handle missing chart_version', async () => {
        const mockRows: FluxHelmReleaseRow[] = [
          {
            helm_repo_url: 'https://charts.example.com/',
            helm_repo_name: 'example',
            chart_name: 'app',
            chart_version: null,
            release_name: 'app',
            url: 'https://github.com/user/repo/blob/main/app.yaml',
            repo_name: 'user/repo',
            hajimari_icon: null,
            hajimari_group: null,
            timestamp: 1704067200,
            stars: 75,
            repo_url: 'https://github.com/user/repo',
          },
        ];

        mockDb.all.mockResolvedValueOnce(mockRows);
        mockDbExtended.all.mockResolvedValue([]);

        const result = await dataCollector.collectReleases();

        expect(result.releases[0].version).toBe('');
      });

      it('should handle missing hajimari_icon', async () => {
        const mockRows: FluxHelmReleaseRow[] = [
          {
            helm_repo_url: 'https://charts.example.com/',
            helm_repo_name: 'example',
            chart_name: 'app',
            chart_version: '1.0.0',
            release_name: 'app',
            url: 'https://github.com/user/repo/blob/main/app.yaml',
            repo_name: 'user/repo',
            hajimari_icon: null,
            hajimari_group: null,
            timestamp: 1704067200,
            stars: 75,
            repo_url: 'https://github.com/user/repo',
          },
        ];

        mockDb.all.mockResolvedValueOnce(mockRows);
        mockDbExtended.all.mockResolvedValue([]);

        const result = await dataCollector.collectReleases();

        expect(result.releases[0].icon).toBeUndefined();
      });

      it('should parse values JSON correctly', async () => {
        const mockRows: FluxHelmReleaseRow[] = [
          {
            helm_repo_url: 'https://charts.example.com/',
            helm_repo_name: 'example',
            chart_name: 'app',
            chart_version: '1.0.0',
            release_name: 'app',
            url: 'https://github.com/user/repo/blob/main/app.yaml',
            repo_name: 'user/repo',
            hajimari_icon: null,
            hajimari_group: null,
            timestamp: 1704067200,
            stars: 75,
            repo_url: 'https://github.com/user/repo',
          },
        ];

        const mockValuesRows: ValuesRow[] = [
          {
            url: 'https://github.com/user/repo/blob/main/app.yaml',
            val: JSON.stringify(mockSimpleValueTree),
          },
        ];

        mockDb.all.mockResolvedValueOnce(mockRows);
        mockDbExtended.all.mockResolvedValueOnce(mockValuesRows);

        const result = await dataCollector.collectReleases();

        expect(result.values['https://github.com/user/repo/blob/main/app.yaml']).toEqual(
          mockSimpleValueTree
        );
      });

      it('should handle malformed JSON in values', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const mockRows: FluxHelmReleaseRow[] = [
          {
            helm_repo_url: 'https://charts.example.com/',
            helm_repo_name: 'example',
            chart_name: 'app',
            chart_version: '1.0.0',
            release_name: 'app',
            url: 'https://github.com/user/repo/blob/main/app.yaml',
            repo_name: 'user/repo',
            hajimari_icon: null,
            hajimari_group: null,
            timestamp: 1704067200,
            stars: 75,
            repo_url: 'https://github.com/user/repo',
          },
        ];

        const mockValuesRows: ValuesRow[] = [
          {
            url: 'https://github.com/user/repo/blob/main/app.yaml',
            val: '{ invalid json',
          },
        ];

        mockDb.all.mockResolvedValueOnce(mockRows);
        mockDbExtended.all.mockResolvedValueOnce(mockValuesRows);

        const result = await dataCollector.collectReleases();

        expect(result.values['https://github.com/user/repo/blob/main/app.yaml']).toEqual({});
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it('should group repos by key correctly', async () => {
        const mockRows: FluxHelmReleaseRow[] = [
          {
            helm_repo_url: 'oci://ghcr.io/bjw-s/helm/',
            helm_repo_name: 'bjw-s',
            chart_name: 'plex',
            chart_version: '1.0.0',
            release_name: 'plex',
            url: 'https://github.com/user1/repo/blob/main/plex.yaml',
            repo_name: 'user1/repo',
            hajimari_icon: 'mdi:plex',
            hajimari_group: 'media',
            timestamp: 1704067200,
            stars: 150,
            repo_url: 'https://github.com/user1/repo',
          },
          {
            helm_repo_url: 'oci://ghcr.io/bjw-s/helm/',
            helm_repo_name: 'bjw-s',
            chart_name: 'plex',
            chart_version: '1.0.0',
            release_name: 'plex',
            url: 'https://github.com/user2/repo/blob/main/plex.yaml',
            repo_name: 'user2/repo',
            hajimari_icon: 'mdi:plex',
            hajimari_group: 'media',
            timestamp: 1704067300,
            stars: 100,
            repo_url: 'https://github.com/user2/repo',
          },
        ];

        mockDb.all.mockResolvedValueOnce(mockRows);
        mockDbExtended.all.mockResolvedValue([]);

        const result = await dataCollector.collectReleases();

        const key = 'ghcr.io-bjw-s-helm-plex';
        expect(result.repos[key]).toHaveLength(2);
        expect(result.repos[key][0].repo).toBe('user1/repo');
        expect(result.repos[key][1].repo).toBe('user2/repo');
      });

      it('should return empty arrays when database is empty', async () => {
        mockDb.all.mockResolvedValueOnce([]);
        mockDbExtended.all.mockResolvedValue([]);

        const result = await dataCollector.collectReleases();

        expect(result.releases).toEqual([]);
        expect(result.repos).toEqual({});
        expect(result.values).toEqual({});
      });
    });

    describe('collectValues', () => {
      it('should fetch values for multiple URLs', async () => {
        const urls = [
          'https://github.com/user1/repo/blob/main/app1.yaml',
          'https://github.com/user2/repo/blob/main/app2.yaml',
        ];

        const mockValuesRows: ValuesRow[] = [
          { url: urls[0], val: JSON.stringify({ enabled: true }) },
          { url: urls[1], val: JSON.stringify({ replicas: 3 }) },
        ];

        mockDbExtended.all.mockResolvedValueOnce(mockValuesRows);

        const result = await dataCollector.collectValues(urls);

        expect(result[urls[0]]).toEqual({ enabled: true });
        expect(result[urls[1]]).toEqual({ replicas: 3 });
      });

      it('should handle empty URL array', async () => {
        const result = await dataCollector.collectValues([]);

        expect(result).toEqual({});
        expect(mockDbExtended.all).not.toHaveBeenCalled();
      });

      it('should parse JSON correctly', async () => {
        const urls = ['https://github.com/user/repo/blob/main/app.yaml'];
        const mockValuesRows: ValuesRow[] = [
          { url: urls[0], val: JSON.stringify(mockValueTree) },
        ];

        mockDbExtended.all.mockResolvedValueOnce(mockValuesRows);

        const result = await dataCollector.collectValues(urls);

        expect(result[urls[0]]).toEqual(mockValueTree);
      });

      it('should handle malformed JSON gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const urls = ['https://github.com/user/repo/blob/main/app.yaml'];
        const mockValuesRows: ValuesRow[] = [{ url: urls[0], val: '{ bad json' }];

        mockDbExtended.all.mockResolvedValueOnce(mockValuesRows);

        const result = await dataCollector.collectValues(urls);

        expect(result[urls[0]]).toEqual({});
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to parse values'),
          expect.anything()
        );

        consoleSpy.mockRestore();
      });

      it('should return empty object for missing values', async () => {
        const urls = ['https://github.com/user/repo/blob/main/app.yaml'];
        mockDbExtended.all.mockResolvedValueOnce([]);

        const result = await dataCollector.collectValues(urls);

        expect(result).toEqual({});
      });

      it('should handle complex value trees', async () => {
        const urls = ['https://github.com/user/repo/blob/main/app.yaml'];
        const complexTree = {
          deeply: {
            nested: {
              value: {
                structure: {
                  with: {
                    many: {
                      levels: true,
                    },
                  },
                },
              },
            },
          },
        };

        const mockValuesRows: ValuesRow[] = [{ url: urls[0], val: JSON.stringify(complexTree) }];

        mockDbExtended.all.mockResolvedValueOnce(mockValuesRows);

        const result = await dataCollector.collectValues(urls);

        expect(result[urls[0]]).toEqual(complexTree);
      });
    });
  });
});
