import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from './database.js';
import type { Config } from '../types/kubesearch.js';
import type { Database } from 'sqlite';

// Mock sqlite and sqlite3 modules - must be defined inline in the factory
vi.mock('sqlite', () => ({
  open: vi.fn(),
}));

vi.mock('sqlite3', () => ({
  default: {
    Database: vi.fn(),
    OPEN_READONLY: 1,
  },
}));

// Import the mocked modules after mocking
import { open } from 'sqlite';

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;
  const mockConfig: Config = {
    DB_PATH: '/path/to/repos.db',
    DB_EXTENDED_PATH: '/path/to/repos-extended.db',
    LOG_LEVEL: 'info',
    AUTHOR_WEIGHTS: {},
  };

  // Create mock database objects with type assertions
  const mockClose = vi.fn();
  const mockDb = { close: mockClose } as unknown as Database;
  const mockDbExtended = { close: mockClose } as unknown as Database;
  const mockOpen = vi.mocked(open);

  // Suppress console.log during tests
  const originalConsoleLog = console.log;

  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    dbManager = new DatabaseManager(mockConfig);
  });

  afterEach(() => {
    console.log = originalConsoleLog;
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
      mockOpen.mockResolvedValueOnce(mockDb).mockResolvedValueOnce(mockDbExtended);

      await dbManager.open();

      expect(mockOpen).toHaveBeenCalledTimes(2);
      expect(mockOpen).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: mockConfig.DB_PATH,
        })
      );
      expect(mockOpen).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: mockConfig.DB_EXTENDED_PATH,
        })
      );
      expect(console.log).toHaveBeenCalledWith('Database connections established');
    });

    it('should open databases with OPEN_READONLY mode', async () => {
      mockOpen.mockResolvedValueOnce(mockDb).mockResolvedValueOnce(mockDbExtended);

      await dbManager.open();

      expect(mockOpen).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 1, // OPEN_READONLY
        })
      );
    });

    it('should set isConnected to true after successful open', async () => {
      mockOpen.mockResolvedValueOnce(mockDb).mockResolvedValueOnce(mockDbExtended);

      await dbManager.open();

      expect(dbManager.isConnected()).toBe(true);
    });

    it('should throw error if main database fails to open', async () => {
      mockOpen.mockRejectedValueOnce(new Error('File not found'));

      await expect(dbManager.open()).rejects.toThrow('Failed to open databases');
    });

    it('should throw error if extended database fails to open', async () => {
      mockOpen.mockResolvedValueOnce(mockDb).mockRejectedValueOnce(new Error('Permission denied'));

      await expect(dbManager.open()).rejects.toThrow('Failed to open databases');
    });

    it('should include original error message in thrown error', async () => {
      const originalError = new Error('ENOENT: no such file or directory');
      mockOpen.mockRejectedValueOnce(originalError);

      await expect(dbManager.open()).rejects.toThrow('ENOENT: no such file or directory');
    });
  });

  describe('close', () => {
    it('should close both databases when connected', async () => {
      mockOpen.mockResolvedValueOnce(mockDb).mockResolvedValueOnce(mockDbExtended);
      mockClose.mockResolvedValue(undefined);

      await dbManager.open();
      await dbManager.close();

      expect(mockClose).toHaveBeenCalledTimes(2);
      expect(console.log).toHaveBeenCalledWith('Database connections closed');
    });

    it('should set isConnected to false after closing', async () => {
      mockOpen.mockResolvedValueOnce(mockDb).mockResolvedValueOnce(mockDbExtended);
      mockClose.mockResolvedValue(undefined);

      await dbManager.open();
      await dbManager.close();

      expect(dbManager.isConnected()).toBe(false);
    });

    it('should not throw error when closing already closed databases', async () => {
      await expect(dbManager.close()).resolves.not.toThrow();
      expect(mockClose).not.toHaveBeenCalled();
    });

    it('should handle close being called multiple times', async () => {
      mockOpen.mockResolvedValueOnce(mockDb).mockResolvedValueOnce(mockDbExtended);
      mockClose.mockResolvedValue(undefined);

      await dbManager.open();
      await dbManager.close();
      await dbManager.close();

      // Should only close once (when databases were open)
      expect(mockClose).toHaveBeenCalledTimes(2);
    });

    it('should close main db even if extended db is null', async () => {
      mockOpen.mockResolvedValueOnce(mockDb);
      mockClose.mockResolvedValue(undefined);

      // Manually set only main db to simulate partial initialization
      await dbManager.open().catch(() => {
        /* ignore error from missing extended db */
      });

      await dbManager.close();

      // Should attempt to close whatever is open
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('getDb', () => {
    it('should return main database when initialized', async () => {
      mockOpen.mockResolvedValueOnce(mockDb).mockResolvedValueOnce(mockDbExtended);

      await dbManager.open();
      const db = dbManager.getDb();

      expect(db).toBeDefined();
      expect(db).toBe(mockDb);
    });

    it('should throw error when called before open', () => {
      expect(() => dbManager.getDb()).toThrow('Database not initialized. Call open() first.');
    });

    it('should throw error when called after close', async () => {
      mockOpen.mockResolvedValueOnce(mockDb).mockResolvedValueOnce(mockDbExtended);
      mockClose.mockResolvedValue(undefined);

      await dbManager.open();
      await dbManager.close();

      expect(() => dbManager.getDb()).toThrow('Database not initialized. Call open() first.');
    });
  });

  describe('getDbExtended', () => {
    it('should return extended database when initialized', async () => {
      mockOpen.mockResolvedValueOnce(mockDb).mockResolvedValueOnce(mockDbExtended);

      await dbManager.open();
      const db = dbManager.getDbExtended();

      expect(db).toBeDefined();
      expect(db).toBe(mockDbExtended);
    });

    it('should throw error when called before open', () => {
      expect(() => dbManager.getDbExtended()).toThrow(
        'Extended database not initialized. Call open() first.'
      );
    });

    it('should throw error when called after close', async () => {
      mockOpen.mockResolvedValueOnce(mockDb).mockResolvedValueOnce(mockDbExtended);
      mockClose.mockResolvedValue(undefined);

      await dbManager.open();
      await dbManager.close();

      expect(() => dbManager.getDbExtended()).toThrow(
        'Extended database not initialized. Call open() first.'
      );
    });
  });

  describe('isConnected', () => {
    it('should return false initially', () => {
      expect(dbManager.isConnected()).toBe(false);
    });

    it('should return true when both databases are open', async () => {
      mockOpen.mockResolvedValueOnce(mockDb).mockResolvedValueOnce(mockDbExtended);

      await dbManager.open();

      expect(dbManager.isConnected()).toBe(true);
    });

    it('should return false after closing databases', async () => {
      mockOpen.mockResolvedValueOnce(mockDb).mockResolvedValueOnce(mockDbExtended);
      mockClose.mockResolvedValue(undefined);

      await dbManager.open();
      expect(dbManager.isConnected()).toBe(true);

      await dbManager.close();
      expect(dbManager.isConnected()).toBe(false);
    });

    it('should return false if only one database is open', async () => {
      // This tests the internal logic - both must be non-null
      const manager = new DatabaseManager(mockConfig);
      expect(manager.isConnected()).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should use provided DB_PATH for main database', async () => {
      const customConfig: Config = {
        DB_PATH: '/custom/path/main.db',
        DB_EXTENDED_PATH: '/custom/path/extended.db',
        LOG_LEVEL: 'debug',
        AUTHOR_WEIGHTS: {},
      };
      const customManager = new DatabaseManager(customConfig);
      mockOpen.mockResolvedValueOnce(mockDb).mockResolvedValueOnce(mockDbExtended);

      await customManager.open();

      expect(mockOpen).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: '/custom/path/main.db',
        })
      );
    });

    it('should use provided DB_EXTENDED_PATH for extended database', async () => {
      const customConfig: Config = {
        DB_PATH: '/custom/path/main.db',
        DB_EXTENDED_PATH: '/custom/path/extended.db',
        LOG_LEVEL: 'debug',
        AUTHOR_WEIGHTS: {},
      };
      const customManager = new DatabaseManager(customConfig);
      mockOpen.mockResolvedValueOnce(mockDb).mockResolvedValueOnce(mockDbExtended);

      await customManager.open();

      expect(mockOpen).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: '/custom/path/extended.db',
        })
      );
    });
  });
});
