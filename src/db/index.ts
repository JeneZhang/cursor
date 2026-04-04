import { File } from 'expo-file-system';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { PhotoNote } from '../types';

let dbPromise: Promise<SQLiteDatabase> | null = null;

function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDatabaseAsync('photo_notes.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS photo_notes (
          id TEXT PRIMARY KEY NOT NULL,
          created_at INTEGER NOT NULL,
          local_uri TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT ''
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

function rowToNote(row: {
  id: string;
  created_at: number;
  local_uri: string;
  description: string;
}): PhotoNote {
  return {
    id: row.id,
    createdAt: row.created_at,
    localUri: row.local_uri,
    description: row.description,
  };
}

export async function listNotes(): Promise<PhotoNote[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    created_at: number;
    local_uri: string;
    description: string;
  }>('SELECT * FROM photo_notes ORDER BY created_at DESC');
  return rows.map(rowToNote);
}

export async function getNote(id: string): Promise<PhotoNote | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    created_at: number;
    local_uri: string;
    description: string;
  }>('SELECT * FROM photo_notes WHERE id = ?', id);
  return row ? rowToNote(row) : null;
}

export async function insertNote(note: PhotoNote): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO photo_notes (id, created_at, local_uri, description) VALUES (?, ?, ?, ?)',
    note.id,
    note.createdAt,
    note.localUri,
    note.description
  );
}

export async function updateDescription(id: string, description: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE photo_notes SET description = ? WHERE id = ?', description, id);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  const note = await getNote(id);
  if (note) {
    try {
      const file = new File(note.localUri);
      if (file.exists) {
        file.delete();
      }
    } catch {
      // ignore missing files
    }
  }
  await db.runAsync('DELETE FROM photo_notes WHERE id = ?', id);
}
