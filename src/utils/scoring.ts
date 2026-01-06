/**
 * Search scoring algorithm
 * From web/src/components/search/hr.tsx:16-58
 * Extended with configurable author weighting
 */

import { SEARCH_WEIGHTS, ReleaseInfo } from '../types/kubesearch.js';

/**
 * Detect author from repository owner
 * @param repo - Repository name (e.g., "onedr0p/cluster")
 * @param authorWeights - Map of author names to check
 * @returns Author identifier or null
 */
function detectAuthor(repo: string, authorWeights: Record<string, number>): string | null {
  // Extract owner from "owner/repo" format
  const owner = repo.split('/')[0]?.toLowerCase() || '';

  // Check each configured author pattern
  for (const author of Object.keys(authorWeights)) {
    if (owner === author.toLowerCase()) {
      return author;
    }
  }

  return null;
}

/**
 * Calculate search score for an individual deployment
 * @param release - Individual deployment to score
 * @param query - Search query
 * @param authorWeights - Author boost multipliers (optional)
 * @returns Score (higher is better)
 */
export function calculateScore(
  release: ReleaseInfo,
  query: string,
  authorWeights: Record<string, number> = {},
): number {
  const normalizedQuery = query.toLowerCase();
  const normalizedName = release.name.toLowerCase();
  const normalizedChart = release.chart.toLowerCase();

  // Calculate full match score - check both release name and chart name
  const isExactMatch = normalizedName === normalizedQuery || normalizedChart === normalizedQuery;
  const fullMatchScore = isExactMatch ? SEARCH_WEIGHTS.fullMatch : 0;

  // Calculate length score based on how much longer the name is compared to the query
  const lengthScore = (release.name.length - query.length) * SEARCH_WEIGHTS.length;

  // Calculate stars score (individual repository quality)
  const starsScore = release.stars * SEARCH_WEIGHTS.stars;

  // Base score
  let score = fullMatchScore - lengthScore + starsScore;

  // Apply author boost multiplier if configured
  if (Object.keys(authorWeights).length > 0) {
    const author = detectAuthor(release.repo, authorWeights);
    if (author && authorWeights[author]) {
      score *= authorWeights[author];
    }
  }

  return score;
}

/**
 * Simplify URL for matching (removes https://, trailing slashes)
 * @param url - URL to simplify
 * @returns Simplified URL
 */
export function simplifyURL(url: string): string {
  return url
    .replace('https://', '')
    .replace('http://', '')
    .replace('oci://', '')
    .replace(/\/$/, '');
}

/**
 * Check if release matches search query
 * @param release - Release to check
 * @param query - Search query
 * @returns true if release matches
 */
export function matchesQuery(release: ReleaseInfo, query: string): boolean {
  const normalizedQuery = query.toLowerCase();

  return (
    release.chart.toLowerCase().includes(normalizedQuery) ||
    release.release.toLowerCase().includes(normalizedQuery) ||
    simplifyURL(release.chartsUrl).toLowerCase().includes(normalizedQuery)
  );
}
