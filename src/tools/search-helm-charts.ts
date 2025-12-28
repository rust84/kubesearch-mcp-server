/**
 * search_helm_charts tool
 * Search for helm charts by name and return deployment examples
 */

import { DataCollector } from '../services/data-collector.js';
import { SearchChartResult } from '../types/kubesearch.js';
import { calculateScore, matchesQuery } from '../utils/scoring.js';

export interface SearchHelmChartsInput {
  query: string;
  limit?: number;
}

export async function searchHelmCharts(
  dataCollector: DataCollector,
  input: SearchHelmChartsInput,
  authorWeights: Record<string, number> = {}
): Promise<SearchChartResult[]> {
  const { query, limit = 20 } = input;

  // Collect all releases from database
  const collectorData = await dataCollector.collectReleases();

  // Filter releases matching query
  const matchingReleases = collectorData.releases.filter(release =>
    matchesQuery(release, query)
  );

  // Score and sort individual deployments (with configurable author weights)
  const scoredDeployments = matchingReleases
    .map(deployment => ({
      deployment,
      score: calculateScore(deployment, query, authorWeights),
    }))
    .sort((a, b) => b.score - a.score);

  // Limit results and return individual deployments
  const results = scoredDeployments
    .slice(0, limit)
    .map(({ deployment, score }) => ({
      name: deployment.name,
      chart: deployment.chart,
      helmRepoURL: deployment.chartsUrl,
      repo: deployment.repo,
      repoUrl: deployment.repoUrl,
      stars: deployment.stars,
      version: deployment.version,
      deploymentUrl: deployment.deploymentUrl,
      icon: deployment.icon,
      key: deployment.key,
      score,
    }));

  return results;
}

export const searchHelmChartsSchema = {
  name: 'search_helm_charts',
  description: 'Search for Helm charts by name and get individual deployment examples from community members, scored by repository quality (stars) and author reputation',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Chart or release name to search for (e.g., "plex", "traefik", "nextcloud")',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10)',
        default: 20,
      },
    },
    required: ['query'],
  },
};
