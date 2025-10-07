import { invoke } from "@tauri-apps/api/core";
import type { Note, NoteMetadata } from "../types";

export function useNotes() {
  const createNote = async (path: string): Promise<Note> => {
    return await invoke<Note>("create_note", { path });
  };

  const getNote = async (path: string): Promise<Note> => {
    return await invoke<Note>("get_note", { path });
  };

  const saveNote = async (path: string, content: string): Promise<void> => {
    await invoke("save_note", { path, content });
  };

  const deleteNote = async (path: string): Promise<void> => {
    await invoke("delete_note", { path });
  };

  const renameNote = async (oldPath: string, newPath: string): Promise<void> => {
    await invoke("rename_note", { oldPath, newPath });
  };

  const getChildren = async (path: string): Promise<NoteMetadata[]> => {
    return await invoke<NoteMetadata[]>("get_children", { path });
  };

  const getRootNotes = async (): Promise<NoteMetadata[]> => {
    return await invoke<NoteMetadata[]>("get_root_notes");
  };

  const searchNotes = async (query: string): Promise<NoteMetadata[]> => {
    return await invoke<NoteMetadata[]>("search_notes", { query });
  };

  const archiveNote = async (path: string): Promise<void> => {
    await invoke("archive_note", { path });
  };

  const unarchiveNote = async (path: string): Promise<void> => {
    await invoke("unarchive_note", { path });
  };

  return {
    createNote,
    getNote,
    saveNote,
    deleteNote,
    renameNote,
    getChildren,
    getRootNotes,
    searchNotes,
    archiveNote,
    unarchiveNote,
  };
}
