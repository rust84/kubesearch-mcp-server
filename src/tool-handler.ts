/**
 * Tool dispatch: maps MCP tool call requests to the corresponding tool
 * implementation and formats the response envelope.
 */

import { DataCollector } from './services/data-collector.js';

import {
  searchDeployments,
  searchDeploymentsSchema,
  SearchDeploymentsInput,
} from './tools/search-deployments.js';
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
import { getChartIndex, getChartIndexSchema, GetChartIndexInput } from './tools/get-chart-index.js';
import { getChartStats, getChartStatsSchema, GetChartStatsInput } from './tools/get-chart-stats.js';
import {
  listChartSources,
  listChartSourcesSchema,
  ListChartSourcesInput,
} from './tools/list-chart-sources.js';

export const toolSchemas = [
  searchDeploymentsSchema,
  listChartSourcesSchema,
  getChartDetailsSchema,
  getChartIndexSchema,
  getChartStatsSchema,
  searchContainerImagesSchema,
];

export async function handleToolCall(
  dataCollector: DataCollector,
  authorWeights: Record<string, number>,
  name: string,
  args: unknown,
) {
  try {
    switch (name) {
      case 'search_deployments': {
        const input = args as unknown as SearchDeploymentsInput;
        const results = await searchDeployments(dataCollector, input, authorWeights);
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
        const results = await getChartDetails(dataCollector, input, authorWeights);
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

      case 'list_chart_sources': {
        const input = args as unknown as ListChartSourcesInput;
        const results = await listChartSources(dataCollector, input);
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
}
