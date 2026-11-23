export type InsertIndex = number | "end";

export function nowIso(): string {
  return new Date().toISOString();
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export interface Ordered {
  order: number;
  createdAt: string;
  id: string;
}

export function byOrder<T extends Ordered>(a: T, b: T): number {
  return a.order - b.order || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

export function byDeletedDesc<T extends { deletedAt: string | null }>(a: T, b: T): number {
  return (b.deletedAt ?? "").localeCompare(a.deletedAt ?? "");
}

export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  const [removed] = copy.splice(from, 1);
  if (removed !== undefined) {
    copy.splice(Math.max(0, Math.min(to, copy.length)), 0, removed);
  }
  return copy;
}

export function maxOrder(records: Array<{ order: number }>): number {
  return records.reduce((m, r) => Math.max(m, r.order), -1) + 1;
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return iso;
  }
}

export function daysLeft(deletedAt: string): number {
  const deleted = new Date(deletedAt).getTime();
  if (Number.isNaN(deleted)) return 0;
  const remaining = 30 - (Date.now() - deleted) / 86_400_000;
  return Math.max(0, Math.ceil(remaining));
}
