/**
 * Test fixtures and mock data for unit tests
 */

import type {
  ReleaseInfo,
  RepoInfo,
  FluxHelmReleaseRow,
  ValueTree,
  ValuesRow,
} from '../types/kubesearch.js';

/**
 * Standard mock ReleaseInfo for testing
 */
export const mockReleaseInfo: ReleaseInfo = {
  release: 'plex',
  chart: 'plex',
  name: 'plex',
  key: 'ghcr.io-test-helm-plex',
  chartsUrl: 'oci://ghcr.io/test/helm/',
  repo: 'testuser/cluster',
  repoUrl: 'https://github.com/testuser/cluster',
  stars: 150,
  version: '1.0.0',
  deploymentUrl:
    'https://github.com/testuser/cluster/blob/main/kubernetes/apps/media/plex/app/helmrelease.yaml',
  icon: 'mdi:plex',
  timestamp: 1704067200,
};

/**
 * Alternative mock ReleaseInfo with different values
 */
export const mockReleaseInfo2: ReleaseInfo = {
  release: 'nginx',
  chart: 'nginx',
  name: 'nginx',
  key: 'charts.bitnami.com-bitnami-nginx',
  chartsUrl: 'https://charts.bitnami.com/bitnami/',
  repo: 'user/repo',
  repoUrl: 'https://github.com/user/repo',
  stars: 50,
  version: '2.1.0',
  deploymentUrl: 'https://github.com/user/repo/blob/main/nginx.yaml',
  timestamp: 1704153600,
};

/**
 * Mock RepoInfo for testing
 */
export const mockRepoInfo: RepoInfo = {
  name: 'plex',
  repo: 'testuser/cluster',
  helm_repo_name: 'test-charts',
  helm_repo_url: 'oci://ghcr.io/test/helm/',
  url: 'https://github.com/testuser/cluster/blob/main/kubernetes/apps/media/plex/app/helmrelease.yaml',
  repo_url: 'https://github.com/testuser/cluster',
  chart_version: '1.0.0',
  stars: 150,
  icon: 'mdi:plex',
  group: 'media',
  timestamp: 1704067200,
};

/**
 * Mock Flux HelmRelease database row
 */
export const mockFluxHelmReleaseRow: FluxHelmReleaseRow = {
  helm_repo_url: 'https://test-charts.github.io/helm-charts/',
  helm_repo_name: 'test-charts',
  chart_name: 'plex',
  chart_version: '1.0.0',
  release_name: 'plex',
  url: 'https://github.com/testuser/cluster/blob/main/kubernetes/apps/media/plex/app/helmrelease.yaml',
  repo_name: 'testuser/cluster',
  hajimari_icon: 'mdi:plex',
  hajimari_group: 'media',
  timestamp: 1704067200,
  stars: 150,
  repo_url: 'https://github.com/testuser/cluster',
};

/**
 * Mock ValueTree for testing nested structures
 */
export const mockValueTree: ValueTree = {
  persistence: {
    config: {
      enabled: true,
      size: '10Gi',
      storageClass: 'local-path',
    },
    media: {
      enabled: true,
      type: 'nfs',
      server: '192.168.1.100',
      path: '/mnt/media',
    },
  },
  image: {
    repository: 'plexinc/pms-docker',
    tag: 'latest',
    pullPolicy: 'IfNotPresent',
  },
  service: {
    main: {
      enabled: true,
      type: 'LoadBalancer',
      ports: {
        http: {
          port: 32400,
        },
      },
    },
  },
  ingress: {
    enabled: false,
  },
  env: {
    TZ: 'America/New_York',
    PLEX_CLAIM: 'claim-token',
  },
};

/**
 * Simple ValueTree for testing
 */
export const mockSimpleValueTree: ValueTree = {
  enabled: true,
  replicas: 3,
  image: {
    repository: 'nginx',
    tag: '1.21.0',
  },
};

/**
 * Mock Values database row
 */
export const mockValuesRow: ValuesRow = {
  url: 'https://github.com/testuser/cluster/blob/main/kubernetes/apps/media/plex/app/helmrelease.yaml',
  val: JSON.stringify(mockValueTree),
};

/**
 * Create a mock ReleaseInfo with custom properties
 */
export function createMockRelease(overrides: Partial<ReleaseInfo>): ReleaseInfo {
  return {
    ...mockReleaseInfo,
    ...overrides,
  };
}

/**
 * Create a mock RepoInfo with custom properties
 */
export function createMockRepoInfo(overrides: Partial<RepoInfo>): RepoInfo {
  return {
    ...mockRepoInfo,
    ...overrides,
  };
}
