#!/usr/bin/env tsx

/**
 * Test script for search_helm_charts functionality
 */

import { DatabaseManager } from './src/services/database.js';
import { DataCollector } from './src/services/data-collector.js';
import { searchHelmCharts } from './src/tools/search-helm-charts.js';
import { Config } from './src/types/kubesearch.js';

const config: Config = {
  DB_PATH: '/home/russell/repos/k8s-at-home-search/repos.db',
  DB_EXTENDED_PATH: '/home/russell/repos/k8s-at-home-search/repos-extended.db',
  LOG_LEVEL: 'info',
  AUTHOR_WEIGHTS: {},
};

async function main() {
  const dbManager = new DatabaseManager(config);
  const dataCollector = new DataCollector(dbManager);

  try {
    await dbManager.open();
    console.log('Database connected\n');

    // Test 1: Search for "openebs" with default limit (10)
    console.log('=== Test 1: Search "openebs" with limit=10 ===');
    const results10 = await searchHelmCharts(dataCollector, {
      query: 'openebs',
      limit: 10,
    });

    console.log(`Total results returned: ${results10.length}`);
    console.log('\nResults:');
    results10.forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.name} - ${result.chart} (score: ${result.score}, stars: ${result.stars})`);
    });

    // Test 2: Search for "openebs" with limit=100
    console.log('\n\n=== Test 2: Search "openebs" with limit=100 ===');
    const results100 = await searchHelmCharts(dataCollector, {
      query: 'openebs',
      limit: 100,
    });

    console.log(`Total results returned: ${results100.length}`);

    // Count by chart path
    const chartCounts = results100.reduce((acc, result) => {
      acc[result.chart] = (acc[result.chart] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\nResults grouped by chart path:');
    Object.entries(chartCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([chart, count]) => {
        console.log(`  ${chart}: ${count} deployments`);
      });

    console.log('\nFirst 20 results:');
    results100.slice(0, 20).forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.name} - ${result.chart} (score: ${result.score}, stars: ${result.stars}, repo: ${result.repo})`);
    });

    // Analyze repository sources
    console.log('\n\n=== Repository Source Analysis ===');

    // Count unique repositories
    const uniqueRepos = new Set(results100.map(r => r.repo));
    console.log(`\nUnique repositories: ${uniqueRepos.size}`);

    // Count deployments per repository
    const repoCounts = results100.reduce((acc, result) => {
      acc[result.repo] = (acc[result.repo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\nRepositories with multiple deployments:');
    Object.entries(repoCounts)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .forEach(([repo, count]) => {
        console.log(`  ${repo}: ${count} deployments`);
      });

    // Analyze by chart path AND repository
    console.log('\n\nChart paths by repository:');
    const chartByRepo = results100.reduce((acc, result) => {
      const key = `${result.chart} (from ${result.repo})`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(chartByRepo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .forEach(([key, count]) => {
        console.log(`  ${key}: ${count}`);
      });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await dbManager.close();
  }
}

main();
