/**
 * get_chart_index tool
 * List all configuration paths available in a chart's deployments
 */

import { DataCollector } from '../services/data-collector.js';
import { ValueTree, ChartIndexResult } from '../types/kubesearch.js';

export interface GetChartIndexInput {
  key: string;
  searchPath?: string;
}

/**
 * Walk a value tree and collect all paths
 */
function collectPaths(tree: ValueTree, prefix: string = ''): Set<string> {
  const paths = new Set<string>();

  // Guard against null/undefined values
  if (!tree || typeof tree !== 'object') {
    return paths;
  }

  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recurse for nested objects
      const nestedPaths = collectPaths(value as ValueTree, path);
      for (const nestedPath of nestedPaths) {
        paths.add(nestedPath);
      }
    } else {
      // Leaf value
      paths.add(path);
    }
  }

  return paths;
}

export async function getChartIndex(
  dataCollector: DataCollector,
  input: GetChartIndexInput,
): Promise<ChartIndexResult> {
  const { key, searchPath } = input;

  // Collect all releases
  const collectorData = await dataCollector.collectReleases();

  // Find releases matching the key
  const matchingRelease = collectorData.releases.find((r) => r.key === key);

  if (!matchingRelease) {
    throw new Error(`Chart with key '${key}' not found`);
  }

  const repos = collectorData.repos[key] || [];

  if (repos.length === 0) {
    throw new Error(`No repositories found for chart '${key}'`);
  }

  // Collect all unique paths across all deployments
  const pathCounts = new Map<string, number>();

  for (const repo of repos) {
    const valueTree = collectorData.values[repo.url];
    if (valueTree) {
      const paths = collectPaths(valueTree);

      for (const path of paths) {
        pathCounts.set(path, (pathCounts.get(path) || 0) + 1);
      }
    }
  }

  // Filter by searchPath if provided
  let filteredPaths = Array.from(pathCounts.entries());
  if (searchPath) {
    const normalizedSearch = searchPath.toLowerCase();
    filteredPaths = filteredPaths.filter(([path]) =>
      path.toLowerCase().startsWith(normalizedSearch),
    );
  }

  // Sort alphabetically by path name
  filteredPaths.sort((a, b) => a[0].localeCompare(b[0]));

  // Convert to result format
  const paths = filteredPaths.map(([path, count]) => ({
    path,
    usageCount: count,
  }));

  return {
    name: matchingRelease.name,
    chartName: matchingRelease.chart,
    totalDeployments: repos.length,
    paths,
  };
}

export const getChartIndexSchema = {
  name: 'get_chart_index',
  description:
    'List all configuration paths available in a chart to help explore what settings can be configured. Returns a flat list of all value paths found across real-world deployments. Use searchPath to filter to a specific section (e.g., "persistence" shows only persistence.config, persistence.cache, etc.). Requires a chart key - use list_chart_sources or search_deployments first to find the key.',
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description:
          'Chart key from list_chart_sources or search_deployments (e.g., "ghcr.io-bjw-s-helm-plex")',
      },
      searchPath: {
        type: 'string',
        description:
          'Optional path prefix to filter results (e.g., "persistence", "ingress", "service"). Case-insensitive prefix matching. Omit to see all top-level paths.',
      },
    },
    required: ['key'],
  },
};
