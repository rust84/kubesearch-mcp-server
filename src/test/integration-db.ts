/**
 * In-memory SQLite database helper for integration tests.
 *
 * Creates real SQLite databases (via the same built-in `node:sqlite` driver
 * the app uses) with the schema of the real `repos.db` / `repos-extended.db`
 * files, so tests can exercise the actual SQL in DataCollector instead of
 * mocking `db.all`.
 */

import { DatabaseSync } from 'node:sqlite';
import { DatabaseManager } from '../services/database.js';

export interface TestDatabases {
  db: DatabaseSync;
  dbExtended: DatabaseSync;
  stubManager: DatabaseManager;
}

const MAIN_DB_SCHEMA = `
  CREATE TABLE flux_helm_release
    (release_name text NOT NULL, chart_name text NOT NULL, chart_version text NULL,
     namespace text NULL, repo_name text NOT NULL, hajimari_icon text NULL,
     hajimari_group text NULL, chart_ref_kind text NULL, lines number NOT NULL,
     url text NOT NULL, timestamp text NOT NULL, helm_repo_name text NOT NULL,
     helm_repo_namespace text NULL);
  CREATE TABLE flux_helm_repo
    (helm_repo_name text NOT NULL, namespace text NOT NULL, helm_repo_url text NOT NULL,
     interval text NULL, repo_name text NOT NULL, lines number NOT NULL,
     url text NOT NULL, timestamp text NOT NULL);
  CREATE TABLE flux_oci_repository
    (name text NOT NULL, tag text NOT NULL, url text NOT NULL,
     namespace text NULL, repo_name text NOT NULL);
  CREATE TABLE argo_helm_application
    (release_name text NOT NULL, chart_name text NOT NULL, chart_version text NULL,
     namespace text NULL, repo_name text NOT NULL, hajimari_icon text NULL,
     hajimari_group text NULL, lines number NOT NULL, url text NOT NULL,
     timestamp text NOT NULL, helm_repo_url text NOT NULL);
  CREATE TABLE repo
    (repo_name text primary key, url text, branch text, stars integer);
`;

const EXTENDED_DB_SCHEMA = `
  CREATE TABLE flux_helm_release_values (url text NOT NULL, val longtext null);
  CREATE TABLE argo_helm_application_values (url text NOT NULL, val longtext null);
`;

/**
 * Open two in-memory SQLite databases with the repos.db / repos-extended.db
 * schema, plus a stub DatabaseManager exposing them via getDb()/getDbExtended().
 */
export function createTestDatabases(): TestDatabases {
  // `enableDoubleQuotedStringLiterals` matches the production DatabaseManager
  // config (see database.ts) so the real UNION ALL query - which uses `""`
  // as an empty string literal in the Argo branch - runs the same way here
  // as it does against the real read-only databases.
  const db = new DatabaseSync(':memory:', { enableDoubleQuotedStringLiterals: true });
  const dbExtended = new DatabaseSync(':memory:', { enableDoubleQuotedStringLiterals: true });

  db.exec(MAIN_DB_SCHEMA);
  dbExtended.exec(EXTENDED_DB_SCHEMA);

  const stubManager = {
    getDb: () => db,
    getDbExtended: () => dbExtended,
  } as unknown as DatabaseManager;

  return { db, dbExtended, stubManager };
}

/**
 * Seed the standard fixture used across integration tests:
 * - one release joined via flux_helm_repo (HelmRepository branch)
 * - one release joined via flux_oci_repository with a NULL release namespace,
 *   exercising the `flux-system` fallback (OCIRepository branch)
 * - one release from argo_helm_application (Argo branch)
 * - matching values rows, including one malformed-JSON row
 */
export function seedStandardFixture(db: DatabaseSync, dbExtended: DatabaseSync): void {
  const plexUrl = 'https://github.com/onedr0p/home-ops/plex.yaml';
  const radarrUrl = 'https://github.com/someone/k8s/radarr.yaml';
  const traefikUrl = 'https://github.com/onedr0p/home-ops/traefik.yaml';

  db.prepare(`INSERT INTO repo (repo_name, url, branch, stars) VALUES (?, ?, ?, ?)`).run(
    'onedr0p/home-ops',
    'https://github.com/onedr0p/home-ops',
    'main',
    2670,
  );
  db.prepare(`INSERT INTO repo (repo_name, url, branch, stars) VALUES (?, ?, ?, ?)`).run(
    'someone/k8s',
    'https://github.com/someone/k8s',
    'main',
    10,
  );

  // Branch 1: HelmRepository
  db.prepare(
    `INSERT INTO flux_helm_release
      (release_name, chart_name, chart_version, namespace, repo_name, hajimari_icon,
       hajimari_group, chart_ref_kind, lines, url, timestamp, helm_repo_name, helm_repo_namespace)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    'plex',
    'plex',
    '1.0.0',
    'media',
    'onedr0p/home-ops',
    null,
    null,
    'HelmRepository',
    0,
    plexUrl,
    '2024-01-01',
    'plex-repo',
    'media',
  );
  db.prepare(
    `INSERT INTO flux_helm_repo
      (helm_repo_name, namespace, helm_repo_url, interval, repo_name, lines, url, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    'plex-repo',
    'media',
    'https://example.github.io/charts/',
    null,
    'onedr0p/home-ops',
    0,
    plexUrl,
    '2024-01-01',
  );

  // Branch 2: OCIRepository (NULL release namespace -> flux-system fallback)
  db.prepare(
    `INSERT INTO flux_helm_release
      (release_name, chart_name, chart_version, namespace, repo_name, hajimari_icon,
       hajimari_group, chart_ref_kind, lines, url, timestamp, helm_repo_name, helm_repo_namespace)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    'radarr',
    'radarr',
    null,
    null,
    'someone/k8s',
    null,
    null,
    'OCIRepository',
    0,
    radarrUrl,
    '2024-01-01',
    'app-template',
    null,
  );
  db.prepare(
    `INSERT INTO flux_oci_repository (name, tag, url, namespace, repo_name)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    'app-template',
    '1.0.0',
    'oci://ghcr.io/bjw-s/helm/app-template',
    'flux-system',
    'someone/k8s',
  );

  // Branch 3: Argo
  db.prepare(
    `INSERT INTO argo_helm_application
      (release_name, chart_name, chart_version, namespace, repo_name, hajimari_icon,
       hajimari_group, lines, url, timestamp, helm_repo_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    'traefik',
    'traefik',
    null,
    null,
    'onedr0p/home-ops',
    null,
    null,
    0,
    traefikUrl,
    '2024-01-01',
    'https://traefik.github.io/charts/',
  );

  // Values
  dbExtended
    .prepare(`INSERT INTO flux_helm_release_values (url, val) VALUES (?, ?)`)
    .run(plexUrl, '{"persistence":{"config":{"enabled":true}}}');
  dbExtended
    .prepare(`INSERT INTO flux_helm_release_values (url, val) VALUES (?, ?)`)
    .run(radarrUrl, '{not json');
  dbExtended
    .prepare(`INSERT INTO argo_helm_application_values (url, val) VALUES (?, ?)`)
    .run(traefikUrl, '{"ingress":{"enabled":true}}');
}
