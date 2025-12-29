/**
 * get_chart_details tool
 * Get detailed information about a specific helm chart
 */

import { DataCollector } from '../services/data-collector.js';
import { ChartDetailsResult, ValueTree } from '../types/kubesearch.js';

export interface GetChartDetailsInput {
  key: string;
  includeValues?: boolean;
  valuesLimit?: number;
  pathsLimit?: number;
  valuePath?: string;
}

/**
 * Walk a value tree and flatten to paths with values and repo info
 */
function flattenValueTree(
  tree: ValueTree,
  repo: string,
  repoUrl: string,
  stars: number,
  prefix: string = ''
): Map<string, { values: Array<{ value: any; repo: string; repoUrl: string; stars: number }>; types: Set<string> }> {
  const result = new Map<string, { values: Array<{ value: any; repo: string; repoUrl: string; stars: number }>; types: Set<string> }>();

  // Guard against null/undefined values
  if (!tree || typeof tree !== 'object') {
    return result;
  }

  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recurse for nested objects
      const nested = flattenValueTree(value as ValueTree, repo, repoUrl, stars, path);
      for (const [nestedPath, nestedData] of nested) {
        const existing = result.get(nestedPath);
        if (existing) {
          existing.values.push(...nestedData.values);
          for (const type of nestedData.types) {
            existing.types.add(type);
          }
        } else {
          result.set(nestedPath, nestedData);
        }
      }
    } else {
      // Leaf value
      const type = Array.isArray(value) ? 'array' : typeof value;
      const existing = result.get(path);

      if (existing) {
        existing.values.push({ value, repo, repoUrl, stars });
        existing.types.add(type);
      } else {
        result.set(path, {
          values: [{ value, repo, repoUrl, stars }],
          types: new Set([type]),
        });
      }
    }
  }

  return result;
}


/**
 * Detect author from repository owner
 */
function detectAuthor(repo: string, authorWeights: Record<string, number>): string | null {
  const owner = repo.split('/')[0]?.toLowerCase() || '';

  for (const author of Object.keys(authorWeights)) {
    if (owner === author.toLowerCase()) {
      return author;
    }
  }

  return null;
}

/**
 * Calculate sort score for a repository (author boost + stars)
 */
function calculateRepoScore(repo: string, stars: number, authorWeights: Record<string, number>): number {
  const author = detectAuthor(repo, authorWeights);
  const authorMultiplier = author && authorWeights[author] ? authorWeights[author] : 1.0;
  return stars * authorMultiplier;
}

export async function getChartDetails(
  dataCollector: DataCollector,
  input: GetChartDetailsInput,
  authorWeights: Record<string, number> = {}
): Promise<ChartDetailsResult> {
  const {
    key,
    includeValues = true,
    valuesLimit: rawValuesLimit = 5,
    pathsLimit: rawPathsLimit = 10,
    valuePath
  } = input;

  // Enforce upper bounds
  const valuesLimit = Math.min(rawValuesLimit, 10);
  const pathsLimit = Math.min(rawPathsLimit, 20);

  // Collect all releases
  const collectorData = await dataCollector.collectReleases();

  // Find releases matching the key
  const matchingRelease = collectorData.releases.find(r => r.key === key);

  if (!matchingRelease) {
    throw new Error(`Chart with key '${key}' not found`);
  }

  const repos = collectorData.repos[key] || [];

  if (repos.length === 0) {
    throw new Error(`No repositories found for chart '${key}'`);
  }

  // Calculate statistics
  const totalRepos = repos.length;

  // Find latest version (semantic versioning aware)
  const versions = repos
    .map(r => r.chart_version)
    .filter(v => v && v.trim() !== '');

  const latestVersion = versions.length > 0 ? versions[0] : 'unknown';

  // Get the first repo for metadata
  const firstRepo = repos[0];
  const helmRepoName = firstRepo.helm_repo_name || 'helm-repo';
  const helmRepoURL = firstRepo.helm_repo_url;

  // Aggregate popular values if requested
  let popularValues: ChartDetailsResult['popularValues'] = undefined;

  if (includeValues) {
    const allValuePaths = new Map<string, { values: Array<{ value: any; repo: string; repoUrl: string; stars: number }>; types: Set<string> }>();

    // Flatten all value trees with repo info
    for (const repo of repos) {
      const valueTree = collectorData.values[repo.url];
      if (valueTree) {
        const flattenedPaths = flattenValueTree(valueTree, repo.repo, repo.repo_url, repo.stars);

        for (const [path, data] of flattenedPaths) {
          const existing = allValuePaths.get(path);

          if (existing) {
            existing.values.push(...data.values);
            for (const type of data.types) {
              existing.types.add(type);
            }
          } else {
            allValuePaths.set(path, {
              values: [...data.values],
              types: new Set(data.types),
            });
          }
        }
      }
    }

    // Filter by valuePath if provided
    let filteredPaths = Array.from(allValuePaths.entries());
    if (valuePath) {
      const normalizedPath = valuePath.toLowerCase();
      filteredPaths = filteredPaths.filter(([path]) =>
        path.toLowerCase().startsWith(normalizedPath)
      );
    }

    // Convert to popular values array with sorted values
    popularValues = filteredPaths
      .map(([path, data]) => {
        // Sort values by repo score (author weight + stars)
        const sortedValues = data.values
          .map(v => ({
            value: v.value,
            repo: v.repo,
            repoUrl: v.repoUrl,
            score: Math.round(calculateRepoScore(v.repo, v.stars, authorWeights) * 10) / 10,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, valuesLimit); // Limit to top N values per path

        return {
          path,
          count: data.values.length,
          types: Array.from(data.types),
          values: sortedValues,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, pathsLimit); // Top N paths (max 20)
  }

  return {
    name: matchingRelease.name,
    chartName: matchingRelease.chart,
    helmRepoURL: helmRepoURL,
    helmRepoName: helmRepoName,
    icon: matchingRelease.icon,
    popularValues,
    statistics: {
      totalRepos,
      latestVersion,
    },
  };
}

export const getChartDetailsSchema = {
  name: 'get_chart_details',
  description: 'Get detailed information about a specific Helm chart including popular configuration values with all variations sorted by repository quality (stars + author reputation). Optionally filter to specific configuration paths (e.g., "persistence" to see only persistence-related settings). TIP: Use get_chart_index first to explore available configuration paths, then use valuePath to narrow down to specific sections. Requires a chart key - use list_chart_sources or search_deployments first to find the key.',
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'Chart key from list_chart_sources or search_deployments (e.g., "ghcr.io-bjw-s-helm-plex")',
      },
      includeValues: {
        type: 'boolean',
        description: 'Include detailed values analysis (default: true)',
        default: true,
      },
      valuesLimit: {
        type: 'number',
        description: 'Maximum number of value variations to return per configuration path (default: 5, max: 10)',
        default: 5,
      },
      pathsLimit: {
        type: 'number',
        description: 'Maximum number of configuration paths to return (default: 10, max: 20)',
        default: 10,
      },
      valuePath: {
        type: 'string',
        description: 'Optional path prefix to filter results (e.g., "persistence" returns only persistence.config, persistence.cache, persistence.tmp, etc.). Case-insensitive prefix matching. Use get_chart_index first to discover available paths.',
      },
    },
    required: ['key'],
  },
};
