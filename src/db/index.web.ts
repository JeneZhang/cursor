/**
 * In-memory store for web dev / VM testing. iOS/Android use SQLite (`index.ts`).
 */
import type { PhotoNote } from '../types';

const notes: PhotoNote[] = [];

export async function listNotes(): Promise<PhotoNote[]> {
  return [...notes].sort((a, b) => b.createdAt - a.createdAt);
}

export async function getNote(id: string): Promise<PhotoNote | null> {
  return notes.find((n) => n.id === id) ?? null;
}

export async function insertNote(note: PhotoNote): Promise<void> {
  notes.push(note);
}

export async function updateDescription(id: string, description: string): Promise<void> {
  const n = notes.find((x) => x.id === id);
  if (n) n.description = description;
}

export async function deleteNote(id: string): Promise<void> {
  const note = notes.find((x) => x.id === id);
  if (note?.localUri.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(note.localUri);
    } catch {
      // ignore
    }
  }
  const i = notes.findIndex((x) => x.id === id);
  if (i >= 0) notes.splice(i, 1);
}
