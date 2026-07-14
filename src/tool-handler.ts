/**
 * Tool dispatch: maps MCP tool call requests to the corresponding tool
 * implementation and formats the response envelope.
 */

import { ZodError } from 'zod';

import { DataCollector } from './services/data-collector.js';

import { searchDeployments, searchDeploymentsSchema } from './tools/search-deployments.js';
import { getChartDetails, getChartDetailsSchema } from './tools/get-chart-details.js';
import {
  searchContainerImages,
  searchContainerImagesSchema,
} from './tools/search-container-images.js';
import { getChartIndex, getChartIndexSchema } from './tools/get-chart-index.js';
import { getChartStats, getChartStatsSchema } from './tools/get-chart-stats.js';
import { listChartSources, listChartSourcesSchema } from './tools/list-chart-sources.js';
import {
  searchDeploymentsInput,
  getChartDetailsInput,
  getChartIndexInput,
  getChartStatsInput,
  listChartSourcesInput,
  searchContainerImagesInput,
} from './tool-inputs.js';

// Patterns matching error messages that are safe (and useful) to send to
// MCP clients verbatim. Everything else is logged server-side and replaced
// with a generic message, so internals like absolute DB paths or driver
// errors never leak to clients. Extend this allowlist deliberately when a
// tool adds a new client-facing error.
//
// Covers the two "not found" phrasings thrown by get-chart-details.ts,
// get-chart-index.ts, and get-chart-stats.ts:
//   - "Chart with key '<key>' not found"
//   - "No repositories found for chart(...)"
const CLIENT_SAFE_ERROR_PATTERNS = [/not found/i, /^No .+ found for/i, /^Unknown tool/];

function isClientSafeError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    CLIENT_SAFE_ERROR_PATTERNS.some((pattern) => pattern.test(error.message))
  );
}

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
        const input = searchDeploymentsInput.parse(args);
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
        const input = getChartDetailsInput.parse(args);
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
        const input = getChartIndexInput.parse(args);
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
        const input = getChartStatsInput.parse(args);
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
        const input = listChartSourcesInput.parse(args);
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
        const input = searchContainerImagesInput.parse(args);
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
    if (error instanceof ZodError) {
      const flattened = error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ');
      return {
        content: [
          {
            type: 'text',
            text: `Error: Invalid arguments for ${name}: ${flattened}`,
          },
        ],
        isError: true,
      };
    }

    if (isClientSafeError(error)) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }

    console.error('tool call failed:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: internal error while executing ${name}`,
        },
      ],
      isError: true,
    };
  }
}
