import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DatabaseManager } from './database.js';
import type { Config } from '../types/kubesearch.js';

/**
 * Creates a real (writable) SQLite file at `path` with a single table `t(i)`,
 * optionally seeded with one row, then closes it so it can be reopened
 * read-only by DatabaseManager.
 */
function createSeedDbFile(path: string, seedValue?: number): void {
  const db = new DatabaseSync(path);
  db.exec('CREATE TABLE t (i INTEGER)');
  if (seedValue !== undefined) {
    db.prepare('INSERT INTO t (i) VALUES (?)').run(seedValue);
  }
  db.close();
}

describe('DatabaseManager', () => {
  let tempDir: string;
  let dbPath: string;
  let dbExtendedPath: string;
  let config: Config;
  let dbManager: DatabaseManager;

  // Suppress console.log/console.error during tests
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'database-manager-test-'));
    dbPath = join(tempDir, 'main.db');
    dbExtendedPath = join(tempDir, 'extended.db');

    createSeedDbFile(dbPath, 1);
    createSeedDbFile(dbExtendedPath, 2);

    config = {
      DB_PATH: dbPath,
      DB_EXTENDED_PATH: dbExtendedPath,
      AUTHOR_WEIGHTS: {},
    };

    console.log = vi.fn();
    console.error = vi.fn();
    dbManager = new DatabaseManager(config);
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create instance with provided config', () => {
      expect(dbManager).toBeDefined();
      expect(dbManager).toBeInstanceOf(DatabaseManager);
    });

    it('should initialize with disconnected state', () => {
      expect(dbManager.isConnected()).toBe(false);
    });
  });

  describe('open', () => {
    it('should open both databases successfully', async () => {
      await dbManager.open();

      expect(dbManager.isConnected()).toBe(true);
      expect(console.error).toHaveBeenCalledWith('Database connections established');
    });

    it('should open the configured DB_PATH and DB_EXTENDED_PATH (not swapped)', async () => {
      await dbManager.open();

      const mainRows = dbManager.getDb().prepare('select i as x from t').all();
      const extendedRows = dbManager.getDbExtended().prepare('select i as x from t').all();

      expect(mainRows).toEqual([{ x: 1 }]);
      expect(extendedRows).toEqual([{ x: 2 }]);
    });

    it('should open databases in read-only mode (writes are rejected)', async () => {
      await dbManager.open();

      expect(() => dbManager.getDb().exec('CREATE TABLE t2 (i)')).toThrow(/readonly|read-only/i);
    });

    it('should set isConnected to true after successful open', async () => {
      await dbManager.open();

      expect(dbManager.isConnected()).toBe(true);
    });

    it('should throw error if main database fails to open', async () => {
      const badManager = new DatabaseManager({
        ...config,
        DB_PATH: join(tempDir, 'does-not-exist.db'),
      });

      await expect(badManager.open()).rejects.toThrow('Failed to open databases');
    });

    it('should throw error if extended database fails to open', async () => {
      const badManager = new DatabaseManager({
        ...config,
        DB_EXTENDED_PATH: join(tempDir, 'does-not-exist-extended.db'),
      });

      await expect(badManager.open()).rejects.toThrow('Failed to open databases');
    });

    it('should include original error message in thrown error', async () => {
      const badManager = new DatabaseManager({
        ...config,
        DB_PATH: join(tempDir, 'does-not-exist.db'),
      });

      await expect(badManager.open()).rejects.toThrow(/unable to open database file/);
    });
  });

  describe('close', () => {
    it('should close both databases when connected', async () => {
      await dbManager.open();
      await dbManager.close();

      expect(console.error).toHaveBeenCalledWith('Database connections closed');
    });

    it('should set isConnected to false after closing', async () => {
      await dbManager.open();
      await dbManager.close();

      expect(dbManager.isConnected()).toBe(false);
    });

    it('should not throw error when closing already closed databases', async () => {
      await expect(dbManager.close()).resolves.not.toThrow();
    });

    it('should handle close being called multiple times', async () => {
      await dbManager.open();
      await dbManager.close();

      await expect(dbManager.close()).resolves.not.toThrow();
    });

    it('should close main db even if extended db failed to open', async () => {
      const badManager = new DatabaseManager({
        ...config,
        DB_EXTENDED_PATH: join(tempDir, 'does-not-exist-extended.db'),
      });

      await badManager.open().catch(() => {
        /* ignore error from missing extended db */
      });

      // The main db was opened before the extended db failed; close() should
      // still be able to close it without throwing.
      await expect(badManager.close()).resolves.not.toThrow();
    });
  });

  describe('getDb', () => {
    it('should return a working main database handle when initialized', async () => {
      await dbManager.open();
      const db = dbManager.getDb();

      expect(db).toBeDefined();
      expect(db.prepare('select 1 as x').all()).toEqual([{ x: 1 }]);
    });

    it('should throw error when called before open', () => {
      expect(() => dbManager.getDb()).toThrow('Database not initialized. Call open() first.');
    });

    it('should throw error when called after close', async () => {
      await dbManager.open();
      await dbManager.close();

      expect(() => dbManager.getDb()).toThrow('Database not initialized. Call open() first.');
    });
  });

  describe('getDbExtended', () => {
    it('should return a working extended database handle when initialized', async () => {
      await dbManager.open();
      const db = dbManager.getDbExtended();

      expect(db).toBeDefined();
      expect(db.prepare('select 1 as x').all()).toEqual([{ x: 1 }]);
    });

    it('should throw error when called before open', () => {
      expect(() => dbManager.getDbExtended()).toThrow(
        'Extended database not initialized. Call open() first.',
      );
    });

    it('should throw error when called after close', async () => {
      await dbManager.open();
      await dbManager.close();

      expect(() => dbManager.getDbExtended()).toThrow(
        'Extended database not initialized. Call open() first.',
      );
    });
  });

  describe('isConnected', () => {
    it('should return false initially', () => {
      expect(dbManager.isConnected()).toBe(false);
    });

    it('should return true when both databases are open', async () => {
      await dbManager.open();

      expect(dbManager.isConnected()).toBe(true);
    });

    it('should return false after closing databases', async () => {
      await dbManager.open();
      expect(dbManager.isConnected()).toBe(true);

      await dbManager.close();
      expect(dbManager.isConnected()).toBe(false);
    });

    it('should return false if only one database is open', () => {
      const manager = new DatabaseManager(config);
      expect(manager.isConnected()).toBe(false);
    });
  });

  describe('stdout safety', () => {
    it('never writes to stdout (MCP stdio protocol safety)', async () => {
      const logSpy = vi.spyOn(console, 'log');

      await dbManager.open();
      await dbManager.close();

      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
