/**
 * Integration tests for DataCollector.collectReleases() / collectValues()
 * against a real (in-memory) SQLite database, exercising the actual UNION ALL
 * query instead of mocking `db.all`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { DataCollector } from './data-collector.js';
import { createTestDatabases, seedStandardFixture } from '../test/integration-db.js';

const plexUrl = 'https://github.com/onedr0p/home-ops/plex.yaml';
const radarrUrl = 'https://github.com/someone/k8s/radarr.yaml';
const traefikUrl = 'https://github.com/onedr0p/home-ops/traefik.yaml';

describe('DataCollector (real SQLite integration)', () => {
  let db: Database<sqlite3.Database, sqlite3.Statement>;
  let dbExtended: Database<sqlite3.Database, sqlite3.Statement>;
  let dataCollector: DataCollector;

  beforeEach(async () => {
    const testDbs = await createTestDatabases();
    db = testDbs.db;
    dbExtended = testDbs.dbExtended;
    await seedStandardFixture(db, dbExtended);
    dataCollector = new DataCollector(testDbs.stubManager);
  });

  afterEach(async () => {
    await db.close();
    await dbExtended.close();
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

    it('parses values for plex and traefik', async () => {
      const result = await dataCollector.collectReleases();

      expect(result.values[plexUrl]).toBeDefined();
      expect(
        (result.values[plexUrl] as never as { persistence: { config: { enabled: boolean } } })
          .persistence.config.enabled,
      ).toBe(true);

      expect(result.values[traefikUrl]).toBeDefined();
      expect(
        (result.values[traefikUrl] as never as { ingress: { enabled: boolean } }).ingress.enabled,
      ).toBe(true);
    });

    it('handles malformed JSON for radarr values without throwing, returning {}', async () => {
      const result = await dataCollector.collectReleases();

      expect(result.values[radarrUrl]).toEqual({});
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
  });
});
