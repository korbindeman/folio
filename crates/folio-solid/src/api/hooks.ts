// Additional reactive hooks for specific use cases
import { createResource, type Resource } from "solid-js";
import { commands } from "./commands";
import type { Note, NoteMetadata } from "../types";

/**
 * Hook to fetch a specific note by path
 */
export function useNote(path: () => string): Resource<Note | undefined> {
  const [note] = createResource(path, commands.getNote);
  return note;
}

/**
 * Hook to fetch children of a note
 */
export function useChildren(
  path: () => string
): Resource<NoteMetadata[] | undefined> {
  const [children] = createResource(path, commands.getChildren);
  return children;
}

/**
 * Hook to fetch ancestors (breadcrumb trail) of a note
 */
export function useAncestors(
  path: () => string
): Resource<NoteMetadata[] | undefined> {
  const [ancestors] = createResource(path, commands.getAncestors);
  return ancestors;
}

/**
 * Hook to fetch root-level notes
 */
export function useRootNotes(): Resource<NoteMetadata[] | undefined> {
  const [rootNotes] = createResource(commands.getRootNotes);
  return rootNotes;
}

/**
 * Hook to search notes
 */
export function useSearch(
  query: () => string | null
): Resource<NoteMetadata[] | undefined> {
  const [results] = createResource(query, (q) => commands.searchNotes(q));
  return results;
}
