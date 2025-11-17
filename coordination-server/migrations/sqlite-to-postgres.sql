-- ============================================================================
-- SQLite to PostgreSQL Migration Script
-- ============================================================================
--
-- This script creates the PostgreSQL schema compatible with StateStorePostgres
-- Use this to migrate from SQLite to PostgreSQL for production deployments
--
-- Prerequisites:
-- - PostgreSQL 12+ installed and running
-- - Database created: CREATE DATABASE coordination;
-- - User with appropriate permissions
--
-- Usage:
-- 1. Connect to your PostgreSQL database:
--    psql -U your_user -d coordination
--
-- 2. Run this script:
--    \i /path/to/sqlite-to-postgres.sql
--
-- 3. Export data from SQLite (if migrating existing data):
--    See data migration section below
--
-- ============================================================================

-- ============================================================================
-- SCHEMA CREATION
-- ============================================================================

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  context JSONB NOT NULL,
  result JSONB,
  session_id TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Create indexes on tasks table
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_session_id ON tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_type ON tasks(status, type);

-- File locks table
CREATE TABLE IF NOT EXISTS file_locks (
  path TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  lock_token TEXT UNIQUE NOT NULL,
  operation TEXT NOT NULL,
  acquired_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL
);

-- Create indexes on file_locks table
CREATE INDEX IF NOT EXISTS idx_file_locks_owner ON file_locks(owner);
CREATE INDEX IF NOT EXISTS idx_file_locks_expires_at ON file_locks(expires_at);

-- Contexts table
CREATE TABLE IF NOT EXISTS contexts (
  id TEXT PRIMARY KEY,
  messages JSONB NOT NULL,
  shared_state JSONB NOT NULL,
  last_updated BIGINT NOT NULL
);

-- Create index on contexts table
CREATE INDEX IF NOT EXISTS idx_contexts_last_updated ON contexts(last_updated);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('tasks', 'file_locks', 'contexts');

-- Check if indexes exist
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('tasks', 'file_locks', 'contexts');

-- ============================================================================
-- DATA MIGRATION GUIDE
-- ============================================================================

-- To migrate existing data from SQLite to PostgreSQL:
--
-- STEP 1: Export data from SQLite
-- --------------------------------
-- Use this Node.js script (save as export-sqlite-data.js):
--
-- ```javascript
-- const sqlite3 = require('sqlite3');
-- const fs = require('fs');
--
-- const db = new sqlite3.Database('./coordination.db');
--
-- const exportTable = (tableName, callback) => {
--   db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
--     if (err) {
--       console.error(`Error exporting ${tableName}:`, err);
--       callback(err);
--       return;
--     }
--     fs.writeFileSync(
--       `${tableName}.json`,
--       JSON.stringify(rows, null, 2)
--     );
--     console.log(`Exported ${rows.length} rows from ${tableName}`);
--     callback();
--   });
-- };
--
-- exportTable('tasks', () => {
--   exportTable('file_locks', () => {
--     exportTable('contexts', () => {
--       db.close();
--       console.log('Export complete!');
--     });
--   });
-- });
-- ```
--
-- Run: node export-sqlite-data.js
--
-- STEP 2: Import data into PostgreSQL
-- ------------------------------------
-- Use this Node.js script (save as import-postgres-data.js):
--
-- ```javascript
-- const { Pool } = require('pg');
-- const fs = require('fs');
--
-- const pool = new Pool({
--   connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/coordination'
-- });
--
-- const importTable = async (tableName) => {
--   const data = JSON.parse(fs.readFileSync(`${tableName}.json`, 'utf8'));
--
--   for (const row of data) {
--     const columns = Object.keys(row).join(', ');
--     const values = Object.values(row);
--     const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
--
--     // Convert JSON strings to proper format
--     const processedValues = values.map(val => {
--       if (tableName === 'tasks' && (typeof val === 'string')) {
--         // Check if it's a JSON column
--         try {
--           return JSON.parse(val);
--         } catch {
--           return val;
--         }
--       }
--       if (tableName === 'contexts' && (typeof val === 'string')) {
--         try {
--           return JSON.parse(val);
--         } catch {
--           return val;
--         }
--       }
--       return val;
--     });
--
--     await pool.query(
--       `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})
--        ON CONFLICT DO NOTHING`,
--       processedValues
--     );
--   }
--
--   console.log(`Imported ${data.length} rows into ${tableName}`);
-- };
--
-- (async () => {
--   try {
--     await importTable('tasks');
--     await importTable('file_locks');
--     await importTable('contexts');
--     console.log('Import complete!');
--   } catch (err) {
--     console.error('Import error:', err);
--   } finally {
--     await pool.end();
--   }
-- })();
-- ```
--
-- Run: node import-postgres-data.js
--
-- STEP 3: Verify migration
-- -------------------------
-- Run these queries in PostgreSQL:

-- Check row counts
SELECT 'tasks' as table_name, COUNT(*) as row_count FROM tasks
UNION ALL
SELECT 'file_locks', COUNT(*) FROM file_locks
UNION ALL
SELECT 'contexts', COUNT(*) FROM contexts;

-- Sample data from each table
SELECT * FROM tasks LIMIT 5;
SELECT * FROM file_locks LIMIT 5;
SELECT * FROM contexts LIMIT 5;

-- ============================================================================
-- CLEANUP (Optional)
-- ============================================================================

-- To drop all tables and start fresh (USE WITH CAUTION!):
-- DROP TABLE IF EXISTS tasks CASCADE;
-- DROP TABLE IF EXISTS file_locks CASCADE;
-- DROP TABLE IF EXISTS contexts CASCADE;

-- ============================================================================
-- PERFORMANCE TUNING (Optional)
-- ============================================================================

-- Enable query logging for debugging
-- ALTER DATABASE coordination SET log_statement = 'all';

-- Analyze tables for query optimization
ANALYZE tasks;
ANALYZE file_locks;
ANALYZE contexts;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tasks', 'file_locks', 'contexts');

-- ============================================================================
-- NOTES
-- ============================================================================

-- Differences from SQLite:
-- 1. TEXT columns remain TEXT (PostgreSQL supports unlimited length TEXT)
-- 2. JSON columns use JSONB for better performance and indexing
-- 3. INTEGER timestamps stored as BIGINT for consistency
-- 4. Indexes are explicitly named for easier management
-- 5. ON CONFLICT clauses replace SQLite's INSERT OR REPLACE

-- Connection String Format:
-- postgresql://[user[:password]@][host][:port][/dbname][?param1=value1&...]
--
-- Examples:
-- - Local: postgresql://postgres:password@localhost:5432/coordination
-- - Production: postgresql://user:pass@prod-db.example.com:5432/coordination
-- - With SSL: postgresql://user:pass@host:5432/db?sslmode=require

-- Environment Variables:
-- Set DATABASE_URL in your environment:
-- export DATABASE_URL="postgresql://user:pass@localhost:5432/coordination"
