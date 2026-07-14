/**
 * DatabaseManager - Manages SQLite database connections
 */

import { DatabaseSync } from 'node:sqlite';
import { Config } from '../types/kubesearch.js';

export class DatabaseManager {
  private db: DatabaseSync | null = null;
  private dbExtended: DatabaseSync | null = null;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Open connections to both databases
   */
  async open(): Promise<void> {
    try {
      // Open main database. `enableDoubleQuotedStringLiterals` restores the
      // legacy SQLite behavior the previous `sqlite3` native driver used by
      // default, which the queries in data-collector.ts rely on (e.g. `""`
      // as an empty string literal in the Argo union branch).
      this.db = new DatabaseSync(this.config.DB_PATH, {
        readOnly: true,
        enableDoubleQuotedStringLiterals: true,
      });

      // Open extended database
      this.dbExtended = new DatabaseSync(this.config.DB_EXTENDED_PATH, {
        readOnly: true,
        enableDoubleQuotedStringLiterals: true,
      });

      console.error('Database connections established');
    } catch (error) {
      throw new Error(`Failed to open databases: ${error}`);
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    if (this.dbExtended) {
      this.dbExtended.close();
      this.dbExtended = null;
    }
    console.error('Database connections closed');
  }

  /**
   * Get main database instance
   */
  getDb(): DatabaseSync {
    if (!this.db) {
      throw new Error('Database not initialized. Call open() first.');
    }
    return this.db;
  }

  /**
   * Get extended database instance
   */
  getDbExtended(): DatabaseSync {
    if (!this.dbExtended) {
      throw new Error('Extended database not initialized. Call open() first.');
    }
    return this.dbExtended;
  }

  /**
   * Check if databases are connected
   */
  isConnected(): boolean {
    return this.db !== null && this.dbExtended !== null;
  }
}
