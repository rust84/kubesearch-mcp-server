/**
 * DataCollector - Queries and aggregates data from SQLite databases
 * Replicates logic from web/src/generators/helm-release/generator.ts
 */

import { DatabaseManager } from './database.js';
import {
  CollectorData,
  ReleaseInfo,
  RepoInfo,
  ValueTree,
  FluxHelmReleaseRow,
  ValuesRow,
} from '../types/kubesearch.js';

/**
 * Map certain HTTP Helm URLs to their OCI equivalents
 * From generator.ts:45-62
 */
export function mergeHelmURL(url: string): string {
  const mapping: Record<string, string> = {
    'https://bjw-s.github.io/helm-charts/': 'oci://ghcr.io/bjw-s/helm/',
    'https://charts.bitnami.com/bitnami/': 'oci://registry-1.docker.io/bitnamicharts/',
    'https://github.com/prometheus-community/helm-charts/':
      'oci://ghcr.io/prometheus-community/charts/',
    'https://prometheus-community.github.io/helm-charts/':
      'oci://ghcr.io/prometheus-community/charts/',
    'https://actions.github.io/actions-runner-controller/':
      'oci://ghcr.io/actions/actions-runner-controller-charts/',
    'https://kyverno.github.io/kyverno/': 'oci://ghcr.io/kyverno/charts/',
    'https://grafana.github.io/helm-charts/': 'oci://ghcr.io/grafana-operator/helm-charts/',
  };

  return mapping[url] || url;
}

/**
 * Generate unique release key from URL, chart name, and release name
 * From generator.ts:65-99
 */
export function releaseKey(_url: string, chart_name: string, release_name: string): string {
  const url = _url
    .replace('https://', '')
    .replace('http://', '')
    .replace('oci://', '')
    .replace(/\/$/, '')
    .replaceAll('/', '-');

  let key: string;

  // OCI Repo's tend to have the chart name as the last part of the URL
  if (url.endsWith(chart_name)) {
    // If the chart name is the same as the release name, use the URL without the release name
    if (chart_name === release_name) {
      key = url;
    } else {
      key = url + '-' + release_name;
    }
  }
  // helm repo case
  else {
    // when the chart name is the same as the release name, use the URL without the release name
    if (chart_name === release_name) {
      key = url + '-' + chart_name;
    } else {
      key = url + '-' + `${chart_name}-${release_name}`;
    }
  }

  return key
    .replaceAll(/\s+/g, '-')
    .replaceAll(/[^a-zA-Z0-9.-]/gi, '')
    .replaceAll(/^\.+/g, '')
    .toLowerCase();
}

export class DataCollector {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  /**
   * Collect all releases from the database
   * Replicates generator.ts:102-248 collector() function
   */
  async collectReleases(): Promise<CollectorData> {
    const db = this.dbManager.getDb();
    const dbExtended = this.dbManager.getDbExtended();

    // SQL query combining Flux HelmReleases (HelmRepository),
    // Flux HelmReleases (OCIRepository), and Argo Applications
    const query = `
      select
        hrep.helm_repo_url,
        hrep.helm_repo_name,
        rel.chart_name,
        rel.chart_version,
        rel.release_name,
        rel.url,
        rel.repo_name,
        rel.hajimari_icon,
        rel.hajimari_group,
        rel.timestamp,
        repo.stars,
        repo.url as repo_url
      from flux_helm_release rel
      join flux_helm_repo hrep
      on rel.helm_repo_name = hrep.helm_repo_name
      and rel.helm_repo_namespace = hrep.namespace
      and rel.repo_name = hrep.repo_name and
      (rel.chart_ref_kind = 'HelmRepository' or rel.chart_ref_kind = 'GitRepository')
      join repo repo
      on rel.repo_name = repo.repo_name
      group by rel.url

      union all

      select
        flor.url as helm_repo_url,
        flor.name as helm_repo_name,
        rel.chart_name,
        rel.chart_version,
        rel.release_name,
        rel.url,
        rel.repo_name,
        rel.hajimari_icon,
        rel.hajimari_group,
        rel.timestamp,
        repo.stars,
        repo.url as repo_url
      from flux_helm_release rel
      join flux_oci_repository flor
      on rel.helm_repo_name = flor.name and
      rel.chart_ref_kind = 'OCIRepository'
      and (
        flor.namespace = rel.helm_repo_namespace
        or (rel.helm_repo_namespace is null and (flor.namespace is null or flor.namespace = 'flux-system'))
      )

      join repo repo
      on rel.repo_name = repo.repo_name
      group by rel.url

      union all

      select
        rel.helm_repo_url as helm_repo_url,
        "" as helm_repo_name,
        rel.chart_name,
        rel.chart_version,
        rel.release_name,
        rel.url,
        rel.repo_name,
        rel.hajimari_icon,
        rel.hajimari_group,
        rel.timestamp,
        repo.stars,
        repo.url as repo_url
      from argo_helm_application rel
      join repo repo
      on rel.repo_name = repo.repo_name
    `;

    const releases: ReleaseInfo[] = [];
    const repos: Record<string, RepoInfo[]> = {};

    // Execute query and collect results
    const rows = await db.all<FluxHelmReleaseRow[]>(query);

    for (const row of rows) {
      const { chart_name, release_name } = row;
      const helm_repo_url = mergeHelmURL(row.helm_repo_url);

      const key = releaseKey(helm_repo_url, chart_name, release_name);

      // Create individual deployment entry (no longer aggregating)
      const deployment: ReleaseInfo = {
        release: release_name,
        chart: chart_name,
        name: release_name,
        chartsUrl: helm_repo_url,
        key,
        repo: row.repo_name,
        repoUrl: row.repo_url,
        stars: row.stars,
        version: row.chart_version || '',
        deploymentUrl: row.url,
        timestamp: row.timestamp,
      };

      if (row.hajimari_icon) {
        deployment.icon = row.hajimari_icon;
      }

      releases.push(deployment);

      // Keep repos mapping for backward compatibility with get_chart_details
      if (!repos[key]) {
        repos[key] = [];
      }

      repos[key].push({
        name: row.release_name,
        repo: row.repo_name,
        helm_repo_name: row.helm_repo_name,
        helm_repo_url,
        url: row.url,
        chart_version: row.chart_version || '',
        repo_url: row.repo_url,
        stars: row.stars,
        icon: row.hajimari_icon || '',
        group: row.hajimari_group || '',
        timestamp: row.timestamp,
      });
    }

    // Fetch values for all deployments
    const keys = Array.from(new Set(Object.keys(repos)));
    const values: Record<string, ValueTree> = {};

    for (const key of keys) {
      const urls = repos[key].map((r) => r.url);
      const valuesQuery = `
        select url, val
        from
          (
            select url, val from flux_helm_release_values
            union all
            select url, val from argo_helm_application_values
          )
        where url in (${urls.map(() => '?').join(',')})
      `;

      const valueRows = await dbExtended.all<ValuesRow[]>(valuesQuery, urls);

      for (const row of valueRows) {
        try {
          values[row.url] = JSON.parse(row.val);
        } catch (error) {
          console.error(`Failed to parse values for ${row.url}:`, error);
          values[row.url] = {};
        }
      }
    }

    return {
      releases, // Individual deployments (no aggregation)
      repos, // Kept for backward compatibility
      values,
    };
  }

  /**
   * Collect values for specific URLs
   */
  async collectValues(urls: string[]): Promise<Record<string, ValueTree>> {
    const dbExtended = this.dbManager.getDbExtended();
    const values: Record<string, ValueTree> = {};

    if (urls.length === 0) return values;

    const valuesQuery = `
      select url, val
      from
        (
          select url, val from flux_helm_release_values
          union all
          select url, val from argo_helm_application_values
        )
      where url in (${urls.map(() => '?').join(',')})
    `;

    const valueRows = await dbExtended.all<ValuesRow[]>(valuesQuery, urls);

    for (const row of valueRows) {
      try {
        values[row.url] = JSON.parse(row.val);
      } catch (error) {
        console.error(`Failed to parse values for ${row.url}:`, error);
        values[row.url] = {};
      }
    }

    return values;
  }
}
