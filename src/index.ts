#!/usr/bin/env node

/**
 * KubeSearch MCP Server
 * Provides tools to query k8s-at-home-search helm deployment examples
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { DatabaseManager } from './services/database.js';
import { DataCollector } from './services/data-collector.js';
import { Config, DEFAULT_AUTHOR_WEIGHTS } from './types/kubesearch.js';

import {
  searchHelmCharts,
  searchHelmChartsSchema,
  SearchHelmChartsInput,
} from './tools/search-helm-charts.js';
import {
  getChartDetails,
  getChartDetailsSchema,
  GetChartDetailsInput,
} from './tools/get-chart-details.js';
import {
  searchContainerImages,
  searchContainerImagesSchema,
  SearchContainerImagesInput,
} from './tools/search-container-images.js';
import {
  getChartIndex,
  getChartIndexSchema,
  GetChartIndexInput,
} from './tools/get-chart-index.js';
import {
  getChartStats,
  getChartStatsSchema,
  GetChartStatsInput,
} from './tools/get-chart-stats.js';

/**
 * Parse author weights from environment variable
 * Expected format: JSON string like '{"bjw-s": 1.5, "onedr0p": 1.2}'
 */
function parseAuthorWeights(): Record<string, number> {
  const authorWeightsEnv = process.env.AUTHOR_WEIGHTS;

  if (!authorWeightsEnv) {
    return DEFAULT_AUTHOR_WEIGHTS;
  }

  try {
    const parsed = JSON.parse(authorWeightsEnv);
    console.error('Loaded custom author weights:', parsed);
    return parsed;
  } catch (error) {
    console.error('Warning: Failed to parse AUTHOR_WEIGHTS, using defaults:', error);
    return DEFAULT_AUTHOR_WEIGHTS;
  }
}

// Load configuration from environment variables
const config: Config = {
  DB_PATH: process.env.KUBESEARCH_DB_PATH || './repos.db',
  DB_EXTENDED_PATH: process.env.KUBESEARCH_DB_EXTENDED_PATH || './repos-extended.db',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  AUTHOR_WEIGHTS: parseAuthorWeights(),
};

// Validate configuration
if (!config.DB_PATH || !config.DB_EXTENDED_PATH) {
  console.error('Error: KUBESEARCH_DB_PATH and KUBESEARCH_DB_EXTENDED_PATH must be set');
  console.error('Example:');
  console.error('  export KUBESEARCH_DB_PATH=/path/to/repos.db');
  console.error('  export KUBESEARCH_DB_EXTENDED_PATH=/path/to/repos-extended.db');
  process.exit(1);
}

// Initialize database and data collector
const dbManager = new DatabaseManager(config);
const dataCollector = new DataCollector(dbManager);

// Create MCP server
const server = new Server(
  {
    name: 'kubesearch-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      searchHelmChartsSchema,
      getChartDetailsSchema,
      getChartIndexSchema,
      getChartStatsSchema,
      searchContainerImagesSchema,
    ],
  };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_helm_charts': {
        const input = args as unknown as SearchHelmChartsInput;
        const results = await searchHelmCharts(dataCollector, input, config.AUTHOR_WEIGHTS);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'get_chart_details': {
        const input = args as unknown as GetChartDetailsInput;
        const results = await getChartDetails(dataCollector, input, config.AUTHOR_WEIGHTS);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'get_chart_index': {
        const input = args as unknown as GetChartIndexInput;
        const results = await getChartIndex(dataCollector, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'get_chart_stats': {
        const input = args as unknown as GetChartStatsInput;
        const results = await getChartStats(dataCollector, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'search_container_images': {
        const input = args as unknown as SearchContainerImagesInput;
        const results = await searchContainerImages(dataCollector, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  try {
    // Open database connections
    await dbManager.open();
    console.error('KubeSearch MCP Server started');
    console.error(`Database: ${config.DB_PATH}`);
    console.error(`Extended Database: ${config.DB_EXTENDED_PATH}`);

    // Create transport and connect
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Handle shutdown
    process.on('SIGINT', async () => {
      console.error('Shutting down...');
      await dbManager.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('Shutting down...');
      await dbManager.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
