/**
 * grep_helm_values tool
 * Search for configuration patterns across all helm values
 */

import { DataCollector } from '../services/data-collector.js';
import { GrepValueResult, ValueTree } from '../types/kubesearch.js';

export interface GrepHelmValuesInput {
  pattern: string;
  limit?: number;
}

/**
 * Flatten a value tree to paths
 */
function flattenValueTree(
  tree: ValueTree,
  prefix: string = ''
): Map<string, any[]> {
  const result = new Map<string, any[]>();

  // Guard against null/undefined values
  if (!tree || typeof tree !== 'object') {
    return result;
  }

  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recurse for nested objects
      const nested = flattenValueTree(value as ValueTree, path);
      for (const [nestedPath, nestedValues] of nested) {
        const existing = result.get(nestedPath);
        if (existing) {
          existing.push(...nestedValues);
        } else {
          result.set(nestedPath, nestedValues);
        }
      }
    } else {
      // Leaf value
      const existing = result.get(path);
      if (existing) {
        existing.push(value);
      } else {
        result.set(path, [value]);
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

export async function grepHelmValues(
  dataCollector: DataCollector,
  input: GrepHelmValuesInput,
  authorWeights: Record<string, number> = {}
): Promise<GrepValueResult[]> {
  const { pattern, limit = 30 } = input;

  // Collect all releases and their values
  const collectorData = await dataCollector.collectReleases();

  // Build URL to deployment mapping for sorting by author weight
  const urlToDeployment = new Map<string, { repo: string; stars: number }>();
  for (const deployment of collectorData.releases) {
    urlToDeployment.set(deployment.deploymentUrl, {
      repo: deployment.repo,
      stars: deployment.stars,
    });
  }

  // Aggregate all value paths across all releases
  const allValuePaths = new Map<string, { urls: string[]; values: any[] }>();

  // Process all values
  for (const [url, valueTree] of Object.entries(collectorData.values)) {
    // Skip null/undefined values (7.2% of database)
    if (!valueTree) continue;

    const flattenedPaths = flattenValueTree(valueTree);

    for (const [path, values] of flattenedPaths) {
      const existing = allValuePaths.get(path);

      if (existing) {
        existing.urls.push(url);
        existing.values.push(...values);
      } else {
        allValuePaths.set(path, {
          urls: [url],
          values: [...values],
        });
      }
    }
  }

  // Filter paths matching pattern (case-insensitive)
  const normalizedPattern = pattern.toLowerCase();
  const matchingPaths = Array.from(allValuePaths.entries()).filter(([path]) =>
    path.toLowerCase().includes(normalizedPattern)
  );

  // Sort by usage count (descending)
  matchingPaths.sort((a, b) => b[1].urls.length - a[1].urls.length);

  // Limit results
  const limitedPaths = matchingPaths.slice(0, limit);

  // Format results
  const results: GrepValueResult[] = limitedPaths.map(([path, data]) => {
    // Get unique URLs
    const uniqueUrls = Array.from(new Set(data.urls));

    // Sort URLs by author weight + stars (prioritize preferred authors)
    const sortedUrls = uniqueUrls.sort((urlA, urlB) => {
      const deploymentA = urlToDeployment.get(urlA);
      const deploymentB = urlToDeployment.get(urlB);

      if (!deploymentA && !deploymentB) return 0;
      if (!deploymentA) return 1;
      if (!deploymentB) return -1;

      const scoreA = calculateRepoScore(deploymentA.repo, deploymentA.stars, authorWeights);
      const scoreB = calculateRepoScore(deploymentB.repo, deploymentB.stars, authorWeights);

      return scoreB - scoreA; // Descending order
    });

    // Take top 5 examples (now sorted by author quality)
    const exampleUrls = sortedUrls.slice(0, 5);

    const examples = exampleUrls.map((url) => ({
      value: data.values[data.urls.indexOf(url)],
      repoUrl: url,
    }));

    return {
      valuePath: path,
      count: uniqueUrls.length,
      examples,
    };
  });

  return results;
}

export const grepHelmValuesSchema = {
  name: 'grep_helm_values',
  description: 'Search for configuration patterns across all Helm values to find how specific settings are used in real deployments',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Value pattern to search for (e.g., "ingress.enabled", "persistence.size")',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 30)',
        default: 30,
      },
    },
    required: ['pattern'],
  },
};
