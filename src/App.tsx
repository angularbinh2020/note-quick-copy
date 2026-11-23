import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Toolbar } from "./components/Toolbar";
import { GroupList } from "./components/GroupList";
import { ItemEditModal } from "./components/ItemEditModal";
import { GroupNameModal } from "./components/GroupNameModal";
import { ImportModeModal } from "./components/ImportModeModal";
import { TrashPanel } from "./components/TrashPanel";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { useNotesStore } from "./store/useNotesStore";

export default function App() {
  const loaded = useNotesStore((s) => s.loaded);
  const loadError = useNotesStore((s) => s.loadError);
  const notice = useNotesStore((s) => s.notice);
  const init = useNotesStore((s) => s.init);
  const setNotice = useNotesStore((s) => s.setNotice);
  const openGroupModal = useNotesStore((s) => s.openGroupModal);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        openGroupModal({ mode: "create" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openGroupModal]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice, setNotice]);

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-zinc-500">
        Đang tải dữ liệu…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <AlertTriangle size={18} />
            Không tải được dữ liệu
          </div>
          <p className="mb-4 break-words">{loadError}</p>
          <p className="mb-4 text-xs text-red-600">
            Nguyên nhân thường gặp: key mã hóa trong Windows Credential Manager đã bị
            xóa hoặc dữ liệu mã hóa không thể giải mã. File backup{" "}
            <code>notes.enc.bak</code> vẫn có thể khôi phục được.
          </p>
          <button
            onClick={() => void init()}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            <RefreshCw size={14} />
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <Toolbar />
      <main className="mx-auto max-w-6xl px-4 py-5">
        <GroupList />
      </main>
      <ItemEditModal />
      <GroupNameModal />
      <ImportModeModal />
      <TrashPanel />
      <ConfirmDialog />
      {notice && (
        <div className="fixed bottom-4 right-4 z-[60] max-w-md rounded-lg bg-zinc-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {notice}
        </div>
      )}
    </div>
  );
}
