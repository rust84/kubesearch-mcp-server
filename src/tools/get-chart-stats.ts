/**
 * get_chart_stats tool
 * Get statistics and metrics about a specific helm chart
 */

import { DataCollector } from '../services/data-collector.js';
import { ChartStatsResult } from '../types/kubesearch.js';
import { calculateScore, matchesQuery } from '../utils/scoring.js';

export interface GetChartStatsInput {
  query: string;
}

export async function getChartStats(
  dataCollector: DataCollector,
  input: GetChartStatsInput
): Promise<ChartStatsResult> {
  const { query } = input;

  // Collect all releases
  const collectorData = await dataCollector.collectReleases();

  // Find matching releases using fuzzy matching
  const matchingReleases = collectorData.releases.filter(release =>
    matchesQuery(release, query)
  );

  if (matchingReleases.length === 0) {
    throw new Error(`No charts found matching query: '${query}'`);
  }

  // Score and find the best match (highest score)
  const scoredMatches = matchingReleases
    .map(release => ({
      release,
      score: calculateScore(release, query, {}),
    }))
    .sort((a, b) => b.score - a.score);

  const matchingRelease = scoredMatches[0].release;
  const key = matchingRelease.key;

  const repos = collectorData.repos[key] || [];

  if (repos.length === 0) {
    throw new Error(`No repositories found for chart '${key}'`);
  }

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

  // Get metadata from first repo
  const firstRepo = repos[0];
  const helmRepoName = firstRepo.helm_repo_name || 'helm-repo';
  const helmRepoURL = firstRepo.helm_repo_url;

  return {
    name: matchingRelease.name,
    chartName: matchingRelease.chart,
    helmRepoURL,
    helmRepoName,
    icon: matchingRelease.icon,
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
  description: 'Get statistics and metrics about a Helm chart including deployment count, repository quality metrics (stars), version distribution, and top repositories using the chart. Supports fuzzy matching - you can search by chart name (e.g., "plex", "prowlarr") without needing the exact chart key first.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Chart or release name to get statistics for (e.g., "plex", "prowlarr", "traefik"). Uses fuzzy matching to find the best match.',
      },
    },
    required: ['query'],
  },
};
