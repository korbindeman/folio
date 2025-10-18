export interface Note {
  id: number;
  path: string;
  content: string;
  modified: number;
}

export interface NoteMetadata {
  id: number;
  path: string;
  modified: number;
  archived: boolean;
}

export type NotesError =
  | { type: "Io"; message: string }
  | { type: "Database"; message: string }
  | { type: "DatabaseCorrupted" }
  | { type: "NotFound"; path: string }
  | { type: "AlreadyExists"; path: string }
  | { type: "ParentNotFound"; path: string };
