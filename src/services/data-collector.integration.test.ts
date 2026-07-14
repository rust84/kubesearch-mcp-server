/**
 * Integration tests for DataCollector.collectReleases() / collectValues() /
 * collectAllValues() against a real (in-memory) SQLite database, exercising
 * the actual UNION ALL query instead of mocking `db.all`.
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
