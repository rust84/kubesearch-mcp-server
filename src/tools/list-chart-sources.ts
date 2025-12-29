/**
 * list_chart_sources tool
 * List all chart sources (helm repos) for a given chart name with deployment counts
 * Helps users compare different sources (official, mirrors, community) for the same chart
 */

import { DataCollector } from '../services/data-collector.js';
import { matchesQuery } from '../utils/scoring.js';

export interface ListChartSourcesInput {
  query: string;
  minCount?: number;
}

export interface ChartSourceEntry {
  name: string;
  chart: string;
  helmRepoURL: string;
  key: string;
  count: number;
  icon?: string;
}

export async function listChartSources(
  dataCollector: DataCollector,
  input: ListChartSourcesInput
): Promise<ChartSourceEntry[]> {
  const { query, minCount = 3 } = input;

  // Collect all releases
  const collectorData = await dataCollector.collectReleases();

  // Find matching releases using fuzzy matching
  const matchingReleases = collectorData.releases.filter(release =>
    matchesQuery(release, query)
  );

  if (matchingReleases.length === 0) {
    return [];
  }

  // Aggregate by key (unique chart path)
  const chartStats = new Map<string, ChartSourceEntry>();

  for (const release of matchingReleases) {
    const key = release.key;

    if (!chartStats.has(key)) {
      // Get count from repos mapping
      const repoCount = collectorData.repos[key]?.length || 0;

      // Only include if meets minimum count
      if (repoCount >= minCount) {
        chartStats.set(key, {
          name: release.name,
          chart: release.chart,
          helmRepoURL: release.chartsUrl,
          key,
          count: repoCount,
          icon: release.icon,
        });
      }
    }
  }

  // Convert to array and sort by count (descending)
  const results = Array.from(chartStats.values())
    .sort((a, b) => b.count - a.count);

  return results;
}

export const listChartSourcesSchema = {
  name: 'list_chart_sources',
  description: 'List all available chart sources (helm repositories) for a given chart name, showing how many deployments use each source. Compare official repos vs mirrors vs community forks to choose the best one. Each result includes a "key" field that can be used with get_chart_details, get_chart_index, or get_chart_stats to get more information about that specific chart source.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Chart or release name to search for (e.g., "openebs", "plex", "traefik")',
      },
      minCount: {
        type: 'number',
        description: 'Minimum number of repositories required to include a chart in results (default: 3)',
        default: 3,
      },
    },
    required: ['query'],
  },
};
