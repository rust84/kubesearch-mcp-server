/**
 * DatabaseManager - Manages SQLite database connections
 */

import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { Config } from '../types/kubesearch.js';

export class DatabaseManager {
  private db: Database<sqlite3.Database, sqlite3.Statement> | null = null;
  private dbExtended: Database<sqlite3.Database, sqlite3.Statement> | null = null;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Open connections to both databases
   */
  async open(): Promise<void> {
    try {
      // Open main database
      this.db = await open({
        filename: this.config.DB_PATH,
        driver: sqlite3.Database,
        mode: sqlite3.OPEN_READONLY,
      });

      // Open extended database
      this.dbExtended = await open({
        filename: this.config.DB_EXTENDED_PATH,
        driver: sqlite3.Database,
        mode: sqlite3.OPEN_READONLY,
      });

      console.log('Database connections established');
    } catch (error) {
      throw new Error(`Failed to open databases: ${error}`);
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
    if (this.dbExtended) {
      await this.dbExtended.close();
      this.dbExtended = null;
    }
    console.log('Database connections closed');
  }

  /**
   * Get main database instance
   */
  getDb(): Database<sqlite3.Database, sqlite3.Statement> {
    if (!this.db) {
      throw new Error('Database not initialized. Call open() first.');
    }
    return this.db;
  }

  /**
   * Get extended database instance
   */
  getDbExtended(): Database<sqlite3.Database, sqlite3.Statement> {
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
