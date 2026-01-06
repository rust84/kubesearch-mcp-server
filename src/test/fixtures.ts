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
  deploymentUrl: 'https://github.com/testuser/cluster/blob/main/kubernetes/apps/media/plex/app/helmrelease.yaml',
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
 * Mock ReleaseInfo with different chart and release names
 */
export const mockReleaseInfoDifferentNames: ReleaseInfo = {
  release: 'my-plex-server',
  chart: 'plex',
  name: 'my-plex-server',
  key: 'ghcr.io-test-charts-helm-plex-my-plex-server',
  chartsUrl: 'oci://ghcr.io/test-charts/helm/',
  repo: 'user/repo',
  repoUrl: 'https://github.com/user/repo',
  stars: 75,
  version: '1.0.0',
  deploymentUrl: 'https://github.com/user/repo/blob/main/plex.yaml',
  icon: 'mdi:plex',
  timestamp: 1704067200,
};

/**
 * Mock ReleaseInfo with high star count
 */
export const mockReleaseInfoHighStars: ReleaseInfo = {
  release: 'popular-chart',
  chart: 'popular-chart',
  name: 'popular-chart',
  key: 'charts.example.com-popular-chart',
  chartsUrl: 'https://charts.example.com/',
  repo: 'popular/repo',
  repoUrl: 'https://github.com/popular/repo',
  stars: 1000,
  version: '3.0.0',
  deploymentUrl: 'https://github.com/popular/repo/blob/main/chart.yaml',
  timestamp: 1704240000,
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
 * Mock Flux HelmRelease row with null values
 */
export const mockFluxHelmReleaseRowNulls: FluxHelmReleaseRow = {
  helm_repo_url: 'https://charts.bitnami.com/bitnami/',
  helm_repo_name: 'bitnami',
  chart_name: 'nginx',
  chart_version: null,
  release_name: 'nginx',
  url: 'https://github.com/user/repo/blob/main/nginx.yaml',
  repo_name: 'user/repo',
  hajimari_icon: null,
  hajimari_group: null,
  timestamp: 1704153600,
  stars: 50,
  repo_url: 'https://github.com/user/repo',
};

/**
 * Mock OCI Repository database row
 */
export const mockOCIRepositoryRow = {
  oci_repo_url: 'oci://ghcr.io/test/helm/',
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
 * Mock Argo Application database row
 */
export const mockArgoApplicationRow = {
  target_revision: '1.0.0',
  chart: 'plex',
  repo_url: 'oci://ghcr.io/test/helm/',
  name: 'plex',
  url: 'https://github.com/testuser/cluster/blob/main/argocd/apps/plex.yaml',
  repo_name: 'testuser/cluster',
  timestamp: 1704067200,
  stars: 150,
  github_url: 'https://github.com/testuser/cluster',
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
 * Mock Values row with malformed JSON
 */
export const mockValuesRowMalformed: ValuesRow = {
  url: 'https://github.com/user/repo/blob/main/bad.yaml',
  val: '{ invalid json',
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

/**
 * Create a mock FluxHelmReleaseRow with custom properties
 */
export function createMockFluxRow(overrides: Partial<FluxHelmReleaseRow>): FluxHelmReleaseRow {
  return {
    ...mockFluxHelmReleaseRow,
    ...overrides,
  };
}

/**
 * Create multiple mock releases for testing lists
 */
export function createMockReleases(count: number, baseOverrides: Partial<ReleaseInfo> = {}): ReleaseInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    ...mockReleaseInfo,
    ...baseOverrides,
    release: `release-${i}`,
    name: `release-${i}`,
    key: `key-${i}`,
    stars: 100 + i * 10,
  }));
}
