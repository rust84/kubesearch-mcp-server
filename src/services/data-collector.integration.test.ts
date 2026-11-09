/**
 * Integration tests for DataCollector.collectReleases() / collectValues() /
 * collectAllValues() against a real (in-memory) SQLite database, exercising
 * the actual UNION ALL query instead of mocking `db.all`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { DataCollector } from './data-collector.js';
import { createTestDatabases, seedStandardFixture } from '../test/integration-db.js';

const plexUrl = 'https://github.com/onedr0p/home-ops/plex.yaml';
const radarrUrl = 'https://github.com/someone/k8s/radarr.yaml';
const traefikUrl = 'https://github.com/onedr0p/home-ops/traefik.yaml';

describe('DataCollector (real SQLite integration)', () => {
  let db: DatabaseSync;
  let dbExtended: DatabaseSync;
  let dataCollector: DataCollector;

  beforeEach(() => {
    const testDbs = createTestDatabases();
    db = testDbs.db;
    dbExtended = testDbs.dbExtended;
    seedStandardFixture(db, dbExtended);
    dataCollector = new DataCollector(testDbs.stubManager);
  });

  afterEach(() => {
    db.close();
    dbExtended.close();
  });

  describe('collectReleases', () => {
    it('returns exactly 3 releases, one per union branch', async () => {
      const result = await dataCollector.collectReleases();
      expect(result.releases).toHaveLength(3);
    });

    it('HelmRepository branch: plex release joins via flux_helm_repo', async () => {
      const result = await dataCollector.collectReleases();
      const plex = result.releases.find((r) => r.release === 'plex');

      expect(plex).toBeDefined();
      expect(plex?.chartsUrl).toBe('https://example.github.io/charts/');
      expect(plex?.stars).toBe(2670);
      expect(plex?.repo).toBe('onedr0p/home-ops');
      // Pinning the actual releaseKey() output (characterization test).
      expect(plex?.key).toBe('example.github.io-charts-plex');
    });

    it('OCIRepository branch: radarr release joins via flux-system fallback (NULL namespace)', async () => {
      const result = await dataCollector.collectReleases();
      const radarr = result.releases.find((r) => r.release === 'radarr');

      expect(radarr).toBeDefined();
      expect(radarr?.chartsUrl).toBe('oci://ghcr.io/bjw-s/helm/app-template');
    });

    it('Argo branch: traefik release exists with empty helm_repo_name mapped through', async () => {
      const result = await dataCollector.collectReleases();
      const traefik = result.releases.find((r) => r.release === 'traefik');

      expect(traefik).toBeDefined();
      const repoInfos = result.repos[traefik!.key];
      expect(repoInfos).toBeDefined();
      expect(repoInfos[0].helm_repo_name).toBe('');
    });

    it('is memoized: two calls return the same object', async () => {
      const first = await dataCollector.collectReleases();
      const second = await dataCollector.collectReleases();

      expect(second).toBe(first);
    });
  });

  describe('collectValues', () => {
    it('returns only the requested URL tree', async () => {
      const values = await dataCollector.collectValues([plexUrl]);

      expect(Object.keys(values)).toEqual([plexUrl]);
      expect(
        (values[plexUrl] as never as { persistence: { config: { enabled: boolean } } }).persistence
          .config.enabled,
      ).toBe(true);
    });

    it('chunks IN-lists over 500 urls without dropping results', async () => {
      const syntheticUrls = Array.from(
        { length: 500 },
        (_, i) => `https://github.com/nobody/nothing/app-${i}.yaml`,
      );
      // Real url placed in the second chunk (position 501)
      const urls = [...syntheticUrls, plexUrl];

      const values = await dataCollector.collectValues(urls);

      expect(Object.keys(values)).toEqual([plexUrl]);
      expect(
        (values[plexUrl] as never as { persistence: { config: { enabled: boolean } } }).persistence
          .config.enabled,
      ).toBe(true);
    });
  });

  describe('collectAllValues', () => {
    it('parses values for plex and traefik', async () => {
      const values = await dataCollector.collectAllValues();

      expect(values[plexUrl]).toBeDefined();
      expect(
        (values[plexUrl] as never as { persistence: { config: { enabled: boolean } } }).persistence
          .config.enabled,
      ).toBe(true);

      expect(values[traefikUrl]).toBeDefined();
      expect(
        (values[traefikUrl] as never as { ingress: { enabled: boolean } }).ingress.enabled,
      ).toBe(true);
    });

    it('handles malformed JSON for radarr values without throwing, returning {}', async () => {
      const values = await dataCollector.collectAllValues();

      expect(values[radarrUrl]).toEqual({});
    });

    it('is memoized: two calls return the same object', async () => {
      const first = await dataCollector.collectAllValues();
      const second = await dataCollector.collectAllValues();

      expect(second).toBe(first);
    });
  });
});

/**
 * Regression tests for issue #148: the collector's OCI join must be scoped to
 * the release's own repo (`flor.repo_name = rel.repo_name`), and every branch
 * of the UNION ALL must be deduped by release url (grouping now wraps the
 * whole compound, not just the first branch). Without these, per-chart
 * deployment counts were inflated and releases were attributed to sibling
 * chart sources.
 */
describe('DataCollector.collectReleases — repo-scoped OCI join and full dedupe (issue #148)', () => {
  let db: DatabaseSync;
  let dbExtended: DatabaseSync;
  let dataCollector: DataCollector;

  const alphaNextcloudUrl = 'https://github.com/alpha/home-ops/blob/main/apps/nextcloud.yaml';
  const betaSonarrUrl = 'https://github.com/beta/home-ops/blob/main/apps/sonarr.yaml';
  const gammaVaultUrl = 'https://github.com/gamma/home-ops/blob/main/apps/vault.yaml';

  const alphaOciUrl = 'oci://ghcr.io/alpha/helm/app-template';
  const betaOciUrl = 'oci://ghcr.io/beta/helm/app-template';

  beforeEach(() => {
    const testDbs = createTestDatabases();
    db = testDbs.db;
    dbExtended = testDbs.dbExtended;
    dataCollector = new DataCollector(testDbs.stubManager);

    for (const [name, stars] of [
      ['alpha/home-ops', 100],
      ['beta/home-ops', 20],
      ['gamma/home-ops', 1],
    ] as const) {
      db.prepare(`INSERT INTO repo (repo_name, url, branch, stars) VALUES (?, ?, 'main', ?)`).run(
        name,
        `https://github.com/${name}`,
        stars,
      );
    }

    const insertRelease = db.prepare(
      `INSERT INTO flux_helm_release
        (release_name, chart_name, chart_version, namespace, repo_name, hajimari_icon,
         hajimari_group, chart_ref_kind, lines, url, timestamp, helm_repo_name, helm_repo_namespace)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertOci = db.prepare(
      `INSERT INTO flux_oci_repository (name, tag, url, namespace, repo_name) VALUES (?, ?, ?, ?, ?)`,
    );

    // OCI release in alpha, NULL helm_repo_namespace (flux-system fallback).
    insertRelease.run(
      'nextcloud',
      'nextcloud',
      '1.0.0',
      'apps',
      'alpha/home-ops',
      null,
      null,
      'OCIRepository',
      0,
      alphaNextcloudUrl,
      '2024-01-01',
      'shared-oci',
      null,
    );
    // OCI release in beta, same helm_repo_name, matching beta's own OCI row.
    insertRelease.run(
      'sonarr',
      'sonarr',
      '2.0.0',
      'media',
      'beta/home-ops',
      null,
      null,
      'OCIRepository',
      0,
      betaSonarrUrl,
      '2024-01-01',
      'shared-oci',
      null,
    );
    // OCI release in gamma: gamma has NO OCI row of its own. Only repos alpha
    // and beta carry an identically-named 'shared-oci' row, so the unscoped
    // join wrongly attributed this release to a sibling chart source.
    insertRelease.run(
      'vault',
      'vault',
      '3.0.0',
      'security',
      'gamma/home-ops',
      null,
      null,
      'OCIRepository',
      0,
      gammaVaultUrl,
      '2024-01-01',
      'shared-oci',
      null,
    );

    // Same-named OCI rows in alpha and beta (the cross-attribution trap).
    insertOci.run('shared-oci', '1.0.0', alphaOciUrl, 'flux-system', 'alpha/home-ops');
    insertOci.run('shared-oci', '2.0.0', betaOciUrl, 'flux-system', 'beta/home-ops');
    // Second row for alpha's own 'shared-oci' (NULL namespace also matches the
    // release's NULL helm_repo_namespace): join fan-out within the same repo,
    // must be collapsed by the url dedupe.
    insertOci.run('shared-oci', '1.0.0', alphaOciUrl, null, 'alpha/home-ops');
  });

  afterEach(() => {
    db.close();
    dbExtended.close();
  });

  it('attributes each OCI release only to its own repo OCIRepository row', async () => {
    const { releases } = await dataCollector.collectReleases();

    const nextcloud = releases.find((r) => r.release === 'nextcloud');
    expect(nextcloud?.chartsUrl).toBe(alphaOciUrl);
    expect(nextcloud?.repo).toBe('alpha/home-ops');

    const sonarr = releases.find((r) => r.release === 'sonarr');
    expect(sonarr?.chartsUrl).toBe(betaOciUrl);
    expect(sonarr?.repo).toBe('beta/home-ops');
  });

  it('does not attribute an OCI release to a sibling repo OCI row', async () => {
    const { releases } = await dataCollector.collectReleases();

    // gamma has no OCI row of its own; the unscoped join matched alpha's and
    // beta's 'shared-oci' rows and surfaced the release under their URLs.
    const vault = releases.find((r) => r.release === 'vault');
    expect(vault).toBeUndefined();
  });

  it('returns exactly one entry per distinct release url across all branches', async () => {
    const { releases } = await dataCollector.collectReleases();

    const urls = releases.map((r) => r.deploymentUrl);
    expect(urls).toHaveLength(new Set(urls).size);
    // alpha's release matched two same-repo OCI rows (flux-system + NULL ns);
    // after repo-scoping + dedupe exactly 2 OCI releases remain.
    expect(urls.sort()).toEqual([alphaNextcloudUrl, betaSonarrUrl].sort());
  });

  it('repos map holds one deployment entry per release (no fan-out duplicates)', async () => {
    const { releases, repos } = await dataCollector.collectReleases();

    const repoEntries = Object.values(repos).flat();
    expect(repoEntries).toHaveLength(releases.length);
  });
});
