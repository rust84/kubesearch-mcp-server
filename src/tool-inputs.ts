/**
 * Zod schemas for validating tool arguments before they reach any tool
 * implementation. Kept separate from the hand-written MCP JSON `inputSchema`
 * objects exported by each tool (those describe the contract to MCP clients
 * and must be kept in sync with these schemas manually).
 */

import { z } from 'zod';

/**
 * A bounded integer limit: valid integers in [1, max] pass through unchanged;
 * anything else (negative, zero, NaN, non-numeric, out of range) falls back
 * to `def` via `.catch()`. This preserves the lenient spirit of the old
 * `Math.min` clamps while eliminating the negative-limit and NaN bugs.
 */
const limit = (def: number, max: number) =>
  z.number().int().min(1).max(max).catch(def).default(def);

export const searchDeploymentsInput = z.object({
  query: z.string().min(1),
  limit: limit(10, 100),
});
export type SearchDeploymentsInput = z.infer<typeof searchDeploymentsInput>;

export const listChartSourcesInput = z.object({
  query: z.string().min(1),
  minCount: limit(3, 1000),
});
export type ListChartSourcesInput = z.infer<typeof listChartSourcesInput>;

export const getChartDetailsInput = z.object({
  key: z.string().min(1),
  includeValues: z.boolean().catch(true).default(true),
  valuesLimit: limit(5, 10),
  pathsLimit: limit(15, 50),
  valuePath: z.string().optional(),
});
export type GetChartDetailsInput = z.infer<typeof getChartDetailsInput>;

export const getChartIndexInput = z.object({
  key: z.string().min(1),
  searchPath: z.string().optional(),
});
export type GetChartIndexInput = z.infer<typeof getChartIndexInput>;

export const getChartStatsInput = z.object({ key: z.string().min(1) });
export type GetChartStatsInput = z.infer<typeof getChartStatsInput>;

export const searchContainerImagesInput = z.object({
  image: z.string().min(1),
  limit: limit(20, 100),
});
export type SearchContainerImagesInput = z.infer<typeof searchContainerImagesInput>;
