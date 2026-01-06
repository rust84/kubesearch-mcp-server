/**
 * search_deployments tool
 * Search for deployment examples from community repositories
 * Returns individual deployments showing how real users configure and deploy charts
 */

import { DataCollector } from '../services/data-collector.js';
import { SearchChartResult } from '../types/kubesearch.js';
import { calculateScore, matchesQuery } from '../utils/scoring.js';

export interface SearchDeploymentsInput {
  query: string;
  limit?: number;
}

export async function searchDeployments(
  dataCollector: DataCollector,
  input: SearchDeploymentsInput,
  authorWeights: Record<string, number> = {},
): Promise<SearchChartResult[]> {
  const { query, limit: rawLimit = 10 } = input;

  // Enforce upper bound
  const limit = Math.min(rawLimit, 100);

  // Collect all releases from database
  const collectorData = await dataCollector.collectReleases();

  // Filter releases matching query
  const matchingReleases = collectorData.releases.filter((release) => matchesQuery(release, query));

  // Score and sort individual deployments (with configurable author weights)
  const scoredDeployments = matchingReleases
    .map((deployment) => ({
      deployment,
      score: calculateScore(deployment, query, authorWeights),
    }))
    .sort((a, b) => b.score - a.score);

  // Limit results and return individual deployments
  const results = scoredDeployments.slice(0, limit).map(({ deployment, score }) => ({
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
    score: Math.round(score * 10) / 10,
  }));

  return results;
}

export const searchDeploymentsSchema = {
  name: 'search_deployments',
  description:
    'Search for real-world deployment examples from community repositories. Returns individual deployments showing how users configure and deploy Helm charts, scored by repository quality (stars) and author reputation. Each result includes a "key" field that can be used with get_chart_details, get_chart_index, or get_chart_stats.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Chart or release name to search for (e.g., "plex", "traefik", "nextcloud")',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10, max: 100)',
        default: 10,
      },
    },
    required: ['query'],
  },
};
