import * as Dialog from "@radix-ui/react-dialog";
import { TriangleAlert } from "lucide-react";
import { cn } from "../lib/utils";
import { useNotesStore } from "../store/useNotesStore";

export function ConfirmDialog() {
  const confirm = useNotesStore((s) => s.confirm);
  const closeConfirm = useNotesStore((s) => s.closeConfirm);

  if (!confirm) return null;

  const run = () => {
    confirm.onConfirm();
    closeConfirm();
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && closeConfirm()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[55] bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[56] w-[min(440px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-2xl focus:outline-none">
          <Dialog.Title className="flex items-center gap-2 text-sm font-semibold">
            {confirm.danger && <TriangleAlert size={16} className="text-red-500" />}
            {confirm.title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-600">
            {confirm.message}
          </Dialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={closeConfirm}
              autoFocus
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Hủy
            </button>
            <button
              onClick={run}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium text-white",
                confirm.danger ? "bg-red-600 hover:bg-red-700" : "bg-zinc-900 hover:bg-zinc-700"
              )}
            >
              {confirm.confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
