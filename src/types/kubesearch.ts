/**
 * Type definitions for k8s-at-home-search data structures
 * Based on web/src/generators/helm-release/models.ts
 */

export interface ReleaseInfo {
  release: string;        // Release name
  chart: string;          // Chart name
  name: string;           // Display name
  key: string;            // Unique identifier
  chartsUrl: string;      // Helm repo URL
  repo: string;           // Repository owner/name (e.g., "onedr0p/cluster")
  repoUrl: string;        // GitHub repository URL
  stars: number;          // Individual repository stars
  version: string;        // Chart version
  deploymentUrl: string;  // URL to YAML file
  icon?: string;          // Hajimari icon
  timestamp: number;      // Deployment timestamp
}

export interface RepoInfo {
  name: string;           // Release name
  repo: string;           // GitHub repo (user/repo)
  helm_repo_name: string;
  helm_repo_url: string;
  url: string;            // Link to YAML file
  repo_url: string;       // GitHub URL
  chart_version: string;
  stars: number;
  icon: string;
  group: string;
  timestamp: number;
}

export interface ValueTree {
  [key: string]: ValueTree | string | number | boolean | null;
}

export interface ValueList {
  name: string;
  count: number;
  types: string[];
  urls: number[];
}

export interface ValuesData {
  list: ValueList[];
  urlMap: Record<number, string>;
  valueMap: Record<string, Record<number, any[]>>;
}

export interface CollectorData {
  releases: ReleaseInfo[];  // Individual deployments (no longer aggregated)
  repos: Record<string, RepoInfo[]>;  // Kept for backward compatibility with get_chart_details
  values: Record<string, ValueTree>;
}

// Database row types
export interface FluxHelmReleaseRow {
  helm_repo_url: string;
  helm_repo_name: string;
  chart_name: string;
  chart_version: string | null;
  release_name: string;
  url: string;
  repo_name: string;
  hajimari_icon: string | null;
  hajimari_group: string | null;
  timestamp: number;
  stars: number;
  repo_url: string;
}

export interface ValuesRow {
  url: string;
  val: string;  // JSON string
}

// MCP Tool result types
export interface SearchChartResult {
  name: string;
  chart: string;
  helmRepoURL: string;
  repo: string;           // Repository owner/name (e.g., "onedr0p/cluster")
  repoUrl: string;        // GitHub repository URL
  stars: number;          // Individual repository stars
  version: string;        // Chart version
  deploymentUrl: string;  // URL to YAML file
  icon?: string;
  key: string;
  score: number;
}

export interface GrepValueResult {
  valuePath: string;
  count: number;
  examples: Array<{
    value: any;
    repoUrl: string;
  }>;
}

export interface ChartDetailsResult {
  name: string;
  chartName: string;
  helmRepoURL: string;
  helmRepoName: string;
  icon?: string;
  popularValues?: Array<{
    path: string;
    count: number;
    types: string[];
    values: Array<{
      value: any;
      repo: string;
      repoUrl: string;
      stars: number;
      score: number;
    }>;
  }>;
  statistics: {
    totalRepos: number;
    avgStars: number;
    latestVersion: string;
  };
}

export interface ImageSearchResult {
  repository: string;
  tags: Array<{
    tag: string;
    usageCount: number;
    deployments: Array<{
      repoName: string;
      repoUrl: string;
    }>;
  }>;
}

export interface ChartIndexResult {
  name: string;
  chartName: string;
  totalDeployments: number;
  paths: Array<{
    path: string;
    usageCount: number;
  }>;
}

// Configuration
export interface Config {
  DB_PATH: string;
  DB_EXTENDED_PATH: string;
  LOG_LEVEL: string;
  AUTHOR_WEIGHTS: Record<string, number>;
}

// Constants
export const MINIMUM_COUNT = 3;

export const SEARCH_WEIGHTS = {
  fullMatch: 10,
  length: 1,
  count: 5,     // No longer used (was deployment count per aggregated chart)
  stars: 0.1,   // Weight for individual repository GitHub stars (0.1 = 10 stars = 1 point)
};

// Default author boost multipliers for preferred maintainers
// Score is multiplied by these values for matching authors
// Can be overridden via AUTHOR_WEIGHTS environment variable
export const DEFAULT_AUTHOR_WEIGHTS: Record<string, number> = {
  'bjw-s': 1.5,           // bjw-s repository deployments (50% boost)
};
