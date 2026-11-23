import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useNotesStore } from "../store/useNotesStore";

export function QuickInput({ groupId }: { groupId: string }) {
  const createItem = useNotesStore((s) => s.createItem);
  const ref = useRef<HTMLTextAreaElement>(null);
  const [hasText, setHasText] = useState(false);

  const reset = () => {
    const el = ref.current;
    if (el) {
      el.value = "";
      el.style.height = "auto";
    }
    setHasText(false);
  };

  const submit = () => {
    const el = ref.current;
    if (!el) return;
    const value = el.value.trim();
    if (value) createItem(groupId, value);
    reset();
    el.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      reset();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    setHasText(el.value.trim().length > 0);
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  return (
    <div className="flex items-end gap-1 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-2 py-1.5 transition-colors focus-within:border-zinc-400 focus-within:bg-white">
      <textarea
        ref={ref}
        rows={1}
        placeholder="Nhập nội dung mới…  (Enter: thêm · Shift+Enter: xuống dòng · Esc: xóa)"
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        className="max-h-36 min-h-6 flex-1 resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-zinc-400"
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={submit}
        aria-label="Thêm item"
        title="Thêm item (Enter)"
        disabled={!hasText}
        className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-800 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
