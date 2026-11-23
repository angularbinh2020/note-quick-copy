export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Group extends BaseRecord {
  name: string;
  collapsed: boolean;
  order: number;
}

export interface Item extends BaseRecord {
  groupId: string;
  content: string;
  order: number;
}

export interface NotesData {
  schemaVersion: number;
  updatedAt: string;
  groups: Group[];
  items: Item[];
}

export interface ImportSummary {
  mode: "replace" | "merge";
  groupsAdded: number;
  itemsAdded: number;
  groupsKept: number;
  itemsKept: number;
}

export interface PurgeResult {
  purged: number;
  data: NotesData;
}

export interface ImportResult {
  summary: ImportSummary;
  data: NotesData;
}

export const UNCATEGORIZED_NAME = "Chưa phân loại";
export const SCHEMA_VERSION = 1;
export const APP_NAME = "note-quick-copy";
