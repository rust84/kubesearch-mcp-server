/**
 * get_chart_stats tool
 * Get statistics and metrics about a specific helm chart
 */

import { DataCollector } from '../services/data-collector.js';
import { ChartStatsResult } from '../types/kubesearch.js';

export interface GetChartStatsInput {
  key: string;
}

export async function getChartStats(
  dataCollector: DataCollector,
  input: GetChartStatsInput
): Promise<ChartStatsResult> {
  const { key } = input;

  // Collect all releases
  const collectorData = await dataCollector.collectReleases();

  const repos = collectorData.repos[key] || [];

  if (repos.length === 0) {
    throw new Error(`No repositories found for chart key: '${key}'`);
  }

  // Get metadata from first repo
  const firstRepo = repos[0];
  const name = firstRepo.name;
  const helmRepoName = firstRepo.helm_repo_name || 'helm-repo';
  const helmRepoURL = firstRepo.helm_repo_url;
  const icon = firstRepo.icon || undefined;

  // Find a release with this key to get the chart name
  const matchingRelease = collectorData.releases.find(r => r.key === key);
  const chartName = matchingRelease?.chart || name;

  // Calculate statistics
  const totalDeployments = repos.length;
  const stars = repos.map(r => r.stars);
  const minStars = Math.min(...stars);
  const maxStars = Math.max(...stars);

  // Get version distribution
  const versionCounts = new Map<string, number>();
  for (const repo of repos) {
    const version = repo.chart_version || 'unknown';
    versionCounts.set(version, (versionCounts.get(version) || 0) + 1);
  }

  const versionDistribution = Array.from(versionCounts.entries())
    .map(([version, count]) => ({ version, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 versions

  const latestVersion = versionDistribution.length > 0 ? versionDistribution[0].version : 'unknown';

  // Get top repositories by stars
  const topRepositories = repos
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 10)
    .map(r => ({
      repo: r.repo,
      repoUrl: r.repo_url,
      stars: r.stars,
      version: r.chart_version || 'unknown',
    }));

  return {
    name,
    chartName,
    helmRepoURL,
    helmRepoName,
    icon,
    statistics: {
      totalDeployments,
      minStars,
      maxStars,
      latestVersion,
    },
    topRepositories,
    versionDistribution,
  };
}

export const getChartStatsSchema = {
  name: 'get_chart_stats',
  description: 'Get statistics and metrics about a specific Helm chart source including deployment count, repository quality metrics (stars), version distribution, and top repositories. Requires a chart key - use list_chart_sources first to find available chart keys.',
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'Chart key from list_chart_sources or search_deployments results (e.g., "ghcr.io-home-operations-charts-mirror-openebs-openebs")',
      },
    },
    required: ['key'],
  },
};
