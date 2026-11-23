import { create } from "zustand";
import { api } from "../lib/api";
import {
  SCHEMA_VERSION,
  UNCATEGORIZED_NAME,
  type Group,
  type ImportResult,
  type Item,
  type NotesData
} from "../lib/types";
import { arrayMove, byOrder, maxOrder, nowIso, uuid, type InsertIndex } from "../lib/utils";

export interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  onConfirm: () => void;
}

type GroupModal = { mode: "create" } | { mode: "rename"; groupId: string };

interface NotesState {
  loaded: boolean;
  loadError: string | null;
  groups: Group[];
  items: Item[];
  notice: string | null;

  editingItemId: string | null;
  groupModal: GroupModal | null;
  trashOpen: boolean;
  importPath: string | null;
  confirm: ConfirmState | null;

  init: () => Promise<void>;
  purgeAndSync: () => Promise<void>;
  flushSave: () => void;
  setNotice: (notice: string | null) => void;

  createGroup: (name: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  deleteGroup: (groupId: string) => void;
  toggleCollapse: (groupId: string) => void;
  reorderGroups: (orderedIds: string[]) => void;

  createItem: (groupId: string, content: string) => void;
  updateItem: (itemId: string, content: string) => void;
  deleteItem: (itemId: string) => void;
  reorderItems: (groupId: string, orderedIds: string[]) => void;
  moveItemToGroup: (itemId: string, toGroupId: string, toIndex: InsertIndex) => void;

  restoreItem: (itemId: string) => void;
  restoreGroup: (groupId: string) => void;
  deleteItemForever: (itemId: string) => void;
  deleteGroupForever: (groupId: string) => void;
  emptyTrash: () => void;

  replaceAll: (data: NotesData) => void;
  applyImport: (result: ImportResult) => void;

  setEditingItem: (itemId: string | null) => void;
  openGroupModal: (modal: GroupModal | null) => void;
  setTrashOpen: (open: boolean) => void;
  startImport: (path: string | null) => void;
  requestConfirm: (confirm: ConfirmState) => void;
  closeConfirm: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(get: () => NotesState): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void saveNow(get);
  }, 500);
}

async function saveNow(get: () => NotesState): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const { groups, items } = get();
  const payload: NotesData = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: nowIso(),
    groups: [...groups],
    items: [...items]
  };
  try {
    await api.saveNotes(payload);
  } catch (err) {
    console.error("Lưu dữ liệu thất bại:", err);
    get().setNotice(`Lưu dữ liệu thất bại: ${String(err)}`);
  }
}

export const useNotesStore = create<NotesState>()((set, get) => ({
  loaded: false,
  loadError: null,
  groups: [],
  items: [],
  notice: null,

  editingItemId: null,
  groupModal: null,
  trashOpen: false,
  importPath: null,
  confirm: null,

  init: async () => {
    try {
      await api.checkKey();
      const purged = await api.purgeTrash();
      set({
        groups: purged.data.groups,
        items: purged.data.items,
        loaded: true,
        loadError: null
      });
      window.setInterval(() => {
        void get().purgeAndSync();
      }, 24 * 60 * 60 * 1000);
    } catch (err) {
      set({
        loaded: true,
        loadError: err instanceof Error ? err.message : String(err)
      });
    }
  },

  purgeAndSync: async () => {
    await saveNow(get);
    try {
      const result = await api.purgeTrash();
      set({ groups: result.data.groups, items: result.data.items });
    } catch (err) {
      console.error("Purge thùng rác thất bại:", err);
    }
  },

  flushSave: () => {
    void saveNow(get);
  },

  setNotice: (notice) => set({ notice }),

  createGroup: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const ts = nowIso();
    const group: Group = {
      id: uuid(),
      name: trimmed,
      collapsed: false,
      order: maxOrder(get().groups),
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null
    };
    set({ groups: [...get().groups, group] });
    scheduleSave(get);
  },

  renameGroup: (groupId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const ts = nowIso();
    set({
      groups: get().groups.map((g) =>
        g.id === groupId ? { ...g, name: trimmed, updatedAt: ts } : g
      )
    });
    scheduleSave(get);
  },

  deleteGroup: (groupId) => {
    const ts = nowIso();
    set({
      groups: get().groups.map((g) =>
        g.id === groupId && !g.deletedAt ? { ...g, deletedAt: ts, updatedAt: ts } : g
      ),
      items: get().items.map((i) =>
        i.groupId === groupId && !i.deletedAt ? { ...i, deletedAt: ts, updatedAt: ts } : i
      )
    });
    scheduleSave(get);
  },

  toggleCollapse: (groupId) => {
    const ts = nowIso();
    set({
      groups: get().groups.map((g) =>
        g.id === groupId ? { ...g, collapsed: !g.collapsed, updatedAt: ts } : g
      )
    });
    scheduleSave(get);
  },

  reorderGroups: (orderedIds) => {
    const ts = nowIso();
    const orderMap = new Map(orderedIds.map((id, idx) => [id, idx]));
    set({
      groups: get().groups.map((g) => {
        const order = orderMap.get(g.id);
        return order !== undefined && !g.deletedAt ? { ...g, order, updatedAt: ts } : g;
      })
    });
    scheduleSave(get);
  },

  createItem: (groupId, content) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const ts = nowIso();
    const item: Item = {
      id: uuid(),
      groupId,
      content: trimmed,
      order: 0,
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null
    };
    set((state) => {
      const others = state.items.filter((i) => !(i.groupId === groupId && !i.deletedAt));
      const actives = state.items
        .filter((i) => i.groupId === groupId && !i.deletedAt)
        .sort(byOrder)
        .map((it, idx) => ({ ...it, order: idx + 1 }));
      return { items: [item, ...actives, ...others] };
    });
    scheduleSave(get);
  },

  updateItem: (itemId, content) => {
    const ts = nowIso();
    set({
      items: get().items.map((i) =>
        i.id === itemId ? { ...i, content, updatedAt: ts } : i
      )
    });
    scheduleSave(get);
  },

  deleteItem: (itemId) => {
    const ts = nowIso();
    set({
      items: get().items.map((i) =>
        i.id === itemId && !i.deletedAt ? { ...i, deletedAt: ts, updatedAt: ts } : i
      )
    });
    scheduleSave(get);
  },

  reorderItems: (_groupId, orderedIds) => {
    const ts = nowIso();
    const orderMap = new Map(orderedIds.map((id, idx) => [id, idx]));
    set({
      items: get().items.map((i) => {
        const order = orderMap.get(i.id);
        return order !== undefined && !i.deletedAt
          ? { ...i, order, updatedAt: ts }
          : i;
      })
    });
    scheduleSave(get);
  },

  moveItemToGroup: (itemId, toGroupId, toIndex) => {
    const ts = nowIso();
    set((state) => {
      const item = state.items.find((i) => i.id === itemId && !i.deletedAt);
      if (!item) return {};

      if (item.groupId === toGroupId) {
        const actives = state.items
          .filter((i) => i.groupId === toGroupId && !i.deletedAt)
          .sort(byOrder);
        const from = actives.findIndex((i) => i.id === itemId);
        if (from === -1) return {};
        const target =
          toIndex === "end" ? actives.length - 1 : Math.max(0, Math.min(toIndex, actives.length - 1));
        if (from === target) return {};
        const moved = arrayMove(actives, from, target);
        const orderMap = new Map(moved.map((it, idx) => [it.id, idx]));
        return {
          items: state.items.map((i) => {
            const order = orderMap.get(i.id);
            return order !== undefined ? { ...i, order, updatedAt: ts } : i;
          })
        };
      }

      const target = state.items
        .filter((i) => i.groupId === toGroupId && !i.deletedAt)
        .sort(byOrder);
      const insertAt = toIndex === "end" ? target.length : Math.max(0, Math.min(toIndex, target.length));
      target.splice(insertAt, 0, { ...item, groupId: toGroupId });
      const orderMap = new Map(target.map((it, idx) => [it.id, idx]));
      return {
        items: state.items.map((i) => {
          if (i.id === itemId) {
            return { ...i, groupId: toGroupId, order: orderMap.get(i.id) ?? 0, updatedAt: ts };
          }
          const order = orderMap.get(i.id);
          return order !== undefined ? { ...i, order, updatedAt: ts } : i;
        })
      };
    });
    scheduleSave(get);
  },

  restoreItem: (itemId) => {
    const ts = nowIso();
    set((state) => {
      const item = state.items.find((i) => i.id === itemId);
      if (!item || !item.deletedAt) return {};
      const groupOk = state.groups.some((g) => g.id === item.groupId && !g.deletedAt);
      if (groupOk) {
        const order = maxOrder(state.items.filter((i) => i.groupId === item.groupId && !i.deletedAt));
        return {
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, deletedAt: null, order, updatedAt: ts } : i
          )
        };
      }
      let uncategorized = state.groups.find(
        (g) => !g.deletedAt && g.name === UNCATEGORIZED_NAME
      );
      let groups = state.groups;
      if (!uncategorized) {
        uncategorized = {
          id: uuid(),
          name: UNCATEGORIZED_NAME,
          collapsed: false,
          order: maxOrder(groups),
          createdAt: ts,
          updatedAt: ts,
          deletedAt: null
        };
        groups = [...groups, uncategorized];
      }
      return {
        groups,
        items: state.items.map((i) =>
          i.id === itemId
            ? { ...i, deletedAt: null, groupId: uncategorized!.id, order: maxOrder(groups.filter((x) => x.id === uncategorized!.id)) , updatedAt: ts }
            : i
        )
      };
    });
    scheduleSave(get);
  },

  restoreGroup: (groupId) => {
    const ts = nowIso();
    set({
      groups: get().groups.map((g) =>
        g.id === groupId && g.deletedAt ? { ...g, deletedAt: null, updatedAt: ts } : g
      ),
      items: get().items.map((i) =>
        i.groupId === groupId && i.deletedAt ? { ...i, deletedAt: null, updatedAt: ts } : i
      )
    });
    scheduleSave(get);
  },

  deleteItemForever: (itemId) => {
    set({ items: get().items.filter((i) => i.id !== itemId) });
    scheduleSave(get);
  },

  deleteGroupForever: (groupId) => {
    set({
      groups: get().groups.filter((g) => g.id !== groupId),
      items: get().items.filter((i) => i.groupId !== groupId)
    });
    scheduleSave(get);
  },

  emptyTrash: () => {
    set({
      groups: get().groups.filter((g) => !g.deletedAt),
      items: get().items.filter((i) => !i.deletedAt)
    });
    scheduleSave(get);
  },

  replaceAll: (data) => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    set({ groups: data.groups, items: data.items });
  },

  applyImport: (result) => {
    get().replaceAll(result.data);
    const { mode, groupsAdded, itemsAdded, groupsKept, itemsKept } = result.summary;
    const message =
      mode === "replace"
        ? `Import replace thành công: ${groupsAdded} group, ${itemsAdded} item.`
        : `Import merge thành công: thêm ${groupsAdded} group, ${itemsAdded} item (giữ lại ${groupsKept} group, ${itemsKept} item trùng id).`;
    set({ notice: message, importPath: null });
  },

  setEditingItem: (itemId) => set({ editingItemId: itemId }),
  openGroupModal: (modal) => set({ groupModal: modal }),
  setTrashOpen: (open) => set({ trashOpen: open }),
  startImport: (path) => set({ importPath: path }),
  requestConfirm: (confirm) => set({ confirm }),
  closeConfirm: () => set({ confirm: null })
}));
