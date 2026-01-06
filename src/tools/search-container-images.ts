/**
 * search_container_images tool
 * Find repositories using specific container images
 */

import { DataCollector } from '../services/data-collector.js';
import { ImageSearchResult, ValueTree } from '../types/kubesearch.js';

export interface SearchContainerImagesInput {
  image: string;
  limit?: number;
}

/**
 * Extract container images from a value tree
 */
function extractImages(tree: ValueTree): Map<string, Set<string>> {
  const images = new Map<string, Set<string>>();

  function walk(obj: unknown) {
    if (obj === null || obj === undefined) return;

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        // Check if this looks like an image field
        if (
          (key === 'repository' || key === 'image') &&
          typeof value === 'string' &&
          (value.includes('/') || value.includes(':'))
        ) {
          // Extract repository (without tag)
          const parts = value.split(':');
          const repository = parts[0];

          const tag = parts.length > 1 ? parts[1] : 'latest';

          if (!images.has(repository)) {
            images.set(repository, new Set());
          }

          images.get(repository)!.add(tag);
        }

        // Recurse
        walk(value);
      }
    }
  }

  walk(tree);
  return images;
}

export async function searchContainerImages(
  dataCollector: DataCollector,
  input: SearchContainerImagesInput
): Promise<ImageSearchResult[]> {
  const { image, limit = 20 } = input;

  // Collect all releases and their values
  const collectorData = await dataCollector.collectReleases();

  // Map: repository -> tag -> URLs[]
  const imageMap = new Map<string, Map<string, string[]>>();

  // Extract images from all values
  for (const [url, valueTree] of Object.entries(collectorData.values)) {
    const imagesInTree = extractImages(valueTree);

    for (const [repository, tags] of imagesInTree) {
      if (!imageMap.has(repository)) {
        imageMap.set(repository, new Map());
      }

      const tagMap = imageMap.get(repository)!;

      for (const tag of tags) {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, []);
        }

        tagMap.get(tag)!.push(url);
      }
    }
  }

  // Filter repositories matching query
  const normalizedImage = image.toLowerCase();
  const matchingRepos = Array.from(imageMap.entries()).filter(([repository]) =>
    repository.toLowerCase().includes(normalizedImage)
  );

  // Sort by total usage (descending)
  matchingRepos.sort((a, b) => {
    const countA = Array.from(a[1].values()).reduce((sum, urls) => sum + urls.length, 0);
    const countB = Array.from(b[1].values()).reduce((sum, urls) => sum + urls.length, 0);
    return countB - countA;
  });

  // Limit results
  const limitedRepos = matchingRepos.slice(0, limit);

  // Format results
  const results: ImageSearchResult[] = limitedRepos.map(([repository, tagMap]) => {
    const tags = Array.from(tagMap.entries()).map(([tag, urls]) => ({
      tag,
      usageCount: urls.length,
      deployments: urls.slice(0, 5).map(url => {
        // Extract repo name from URL
        // Format: https://github.com/user/repo/...
        const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
        const repoName = match ? match[1] : url;

        return {
          repoName,
          repoUrl: url,
        };
      }),
    }));

    // Sort tags by usage count
    tags.sort((a, b) => b.usageCount - a.usageCount);

    return {
      repository,
      tags,
    };
  });

  return results;
}

export const searchContainerImagesSchema = {
  name: 'search_container_images',
  description: 'Find Helm deployments using specific container images to see how images are configured in real deployments',
  inputSchema: {
    type: 'object',
    properties: {
      image: {
        type: 'string',
        description: 'Container image repository to search for (e.g., "ghcr.io/linuxserver/plex")',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 20)',
        default: 20,
      },
    },
    required: ['image'],
  },
};
