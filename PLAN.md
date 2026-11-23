# PLAN — Note Quick Copy

Ứng dụng ghi chú nhanh dạng group/item, tối ưu cho việc **copy nội dung**, hoạt động **offline trên Windows 10/11**, dữ liệu **mã hóa khi lưu trữ**.

---

## 1. Tổng quan

- Người dùng tạo nhiều **Group** (đặt tên). Mỗi group chứa nhiều **Item**.
- Item chỉ có 1 trường dữ liệu: `content` (text, nhập qua textarea).
- Mục đích chính: lưu các đoạn text hay dùng → copy nhanh bằng 1 click.
- Desktop app, chạy hoàn toàn offline.

---

## 2. Yêu cầu chức năng

### FR-1. Quản lý Group
- Tạo group mới bằng cách nhập **group name** (nút "+ New group" / input).
- Sau khi tạo, group hiển thị: **tên group + nút Edit (đổi tên) + nút Xóa group**.
- Click vào **tên group** → **collapse/expand** vùng nội dung (danh sách item).
- Nút Edit group → mở popup đổi tên.
- Nút Xóa group → confirm trước khi xóa; xóa group = xóa toàn bộ item bên trong (chuyển cả group + items vào thùng rác — xem FR-6).

### FR-2. Quản lý Item
- Item chỉ có 1 field: `content` (textarea).
- Tạo nhanh: ở **đầu mỗi group** có **ô quick input** (textarea 1 dòng, tự cao khi gõ nhiều dòng). Nhập xong:
  - `Enter` → tạo item mới ở **đầu danh sách** item của group.
  - `Shift+Enter` → xuống dòng (nội dung nhiều dòng).
  - `Escape` → xóa trắng ô input.
- Item khi hiển thị ở danh sách: **tối đa 2 dòng** (`line-clamp-2`), click vào nội dung → mở popup edit xem đầy đủ.
- Mỗi item có 3 nút hành động:
  - **Copy** → copy `content` vào clipboard, hiện feedback "Copied!" (icon đổi 1-2s).
  - **Delete** → chuyển item vào **thùng rác** (soft delete), không hỏi confirm (dễ hoàn tác từ thùng rác).
  - **Edit** → mở **popup (modal)** chứa textarea đầy đủ để sửa nội dung; `Ctrl+Enter` = lưu, `Escape` = đóng.

### FR-3. Sắp xếp & kéo thả (Drag & Drop)
- **Kéo thả item**: đổi thứ tự item trong cùng group, và **kéo item sang group khác**.
- **Kéo thả group**: đổi vị trí (thứ tự) các group.
- Dùng `@dnd-kit/core` + `@dnd-kit/sortable`; phân biệt loại kéo theo `data.type = 'group' | 'item'`.
- Thứ tự mới được lưu vào store + persist ngay sau khi thả (debounce).

### FR-4. Layout / Responsive
- **Màn hình lớn (≥ 1024px):** các group sắp xếp dạng **grid 2 cột** (2 group cùng 1 hàng).
- **Màn hình nhỏ:** grid 1 cột (stack dọc).
- **Trong 1 group, khi màn hình rộng:** danh sách item hiển thị **tối đa 2 cột** (items xếp 2 cột trong group). Mặc định auto theo độ rộng group (CSS grid/columns); trên màn hẹp là 1 cột.
- Giữ layout ổn định khi collapse/expand (CSS grid, không layout-shift mạnh).

### FR-5. Import / Export JSON
- **Export:** xuất toàn bộ data (groups + items) ra file `.json` theo schema bên dưới (Save dialog, người dùng chọn nơi lưu).
- **Import:** chọn file `.json` hợp lệ; hiển thị dialog chọn chế độ:
  - **Replace** — thay toàn bộ data hiện tại (tự động backup file hiện tại trước khi replace).
  - **Merge** — gộp thêm; trùng `id` → giữ bản trong app, thêm bản mới theo `updatedAt` mới hơn.
- Validate schema + version trước khi import; lỗi → thông báo, không thay đổi data.

### FR-6. Thùng rác (Trash) & tự xóa sau 30 ngày
- Item/group bị xóa → chuyển vào **thùng rác** (soft delete, gắn `deletedAt`).
- Nút **Thùng rác** trên toolbar → mở panel/popup liệt kê item đã xóa: xem nội dung, **Khôi phục** (về group cũ; nếu group đã xóa thì về "Chưa phân loại" hoặc group gốc nếu còn), **Xóa vĩnh viễn**, **Dọn sạch thùng rác** (có confirm).
- **Tự động xóa vĩnh viễn** các mục đã trong thùng rác **quá 30 ngày**: chạy khi mở app và định kỳ mỗi 24h.

### FR-7. Mã hóa dữ liệu khi lưu trữ
- Toàn bộ data được **mã hóa AES-256-GCM trước khi ghi xuống đĩa**; khi app load → **tự động giải mã** để hiển thị (trong suốt với người dùng).
- Chi tiết cơ chế xem mục [5. Bảo mật & Mã hóa](#5-bảo-mật--mã-hóa).

### FR-8. Copy nhanh
- Copy hoạt động cả khi item ở trạng thái collapsed group (copy từ list).
- Sau khi copy, giữ focus để có thể copy nhiều item liên tiếp bằng thao tác lặp.

---

## 3. Yêu cầu phi chức năng

| # | Yêu cầu |
|---|---------|
| NFR-1 | Hoạt động **offline 100%**, không gọi network. Cài đặt 1 lần bằng installer `.msi` / `.exe` (NSIS) cho Windows 10/11 x64. |
| NFR-2 | **Mã hóa at-rest** (AES-256-GCM). File dữ liệu trên đĩa không đọc được plaintext. |
| NFR-3 | Hiệu năng: mở app < 1s; thao tác UI mượt với hàng nghìn item; autosave debounce ~500ms. |
| NFR-4 | Dữ liệu không mất: ghi file an toàn (ghi file tạm + atomic rename), giữ 1 file backup gần nhất. |
| NFR-5 | Kích thước cài đặt nhỏ (Tauri ~ < 10MB). |
| NFR-6 | Unikey/IME + tiếng Việt hoạt động đúng trong các ô input/textarea. |

---

## 4. Kiến trúc

- **Backend Rust (Tauri 2):** phụ trách storage + mã hóa + purge + import/export file dialog.
  - Crates: `tauri`, `serde`, `serde_json`, `aes-gcm`, `keyring`, `zeroize`, `uuid`, `chrono`, `thiserror`, `tauri-plugin-dialog`, `tauri-plugin-clipboard-manager`.
- **Frontend:** Vite + **React 18** + TypeScript, **Tailwind CSS**, **Zustand** (state + persist qua IPC), **@dnd-kit/core + @dnd-kit/sortable** (drag & drop), **@radix-ui/react-dialog** (popup edit/confirm), `lucide-react` (icons).
- Giao tiếp frontend ↔ backend qua **Tauri IPC commands**:

| Command | Mô tả |
|---|---|
| `load_notes` | Đọc + giải mã file data → trả JSON |
| `save_notes(payload)` | Mã hóa + ghi file (atomic) |
| `export_json(path)` | Xuất JSON plaintext ra file user chọn |
| `import_json(path)` | Đọc + validate file JSON |
| `purge_trash()` | Xóa vĩnh viễn mục quá 30 ngày |
| `get_or_create_key` | Lấy/tạo encryption key trong OS keyring |

> Lý do mã hóa ở backend Rust (không phải JS): key nằm trong OS keystore, không lộ qua devtools; khó bị can thiệp hơn.

### Cấu trúc thư mục (dự kiến)

```
src/                      # Frontend
  components/
    GroupList.tsx         # Grid 2 cột chứa các group
    GroupCard.tsx         # Header (tên, edit, delete, collapse) + vùng item
    QuickInput.tsx        # Ô tạo nhanh item
    ItemRow.tsx           # Item 2 dòng + nút copy/delete/edit
    ItemEditModal.tsx     # Popup edit item
    GroupNameModal.tsx    # Tạo/đổi tên group
    TrashPanel.tsx        # Thùng rác
    Toolbar.tsx           # New group, import, export, trash
  store/
    useNotesStore.ts      # Zustand store (groups, items, ui state)
  lib/
    api.ts                # Wrapper gọi Tauri IPC
    types.ts              # Kiểu dữ liệu dùng chung
src-tauri/
  src/
    main.rs, commands.rs  # IPC handlers
    crypto.rs             # AES-GCM encrypt/decrypt + keyring
    storage.rs            # Đọc/ghi file atomic, backup
    model.rs              # Struct data (serde)
    trash.rs              # Purge 30 ngày
```

---

## 5. Bảo mật & Mã hóa

- **Thuật toán:** AES-256-GCM (authenticated encryption).
- **Key management:**
  - Lần đầu chạy app: sinh key ngẫu nhiên 32 bytes (CSPRNG) → lưu vào **Windows Credential Manager** qua crate `keyring` (entry: `note-quick-copy/notes-key`).
  - Mỗi lần app mở: lấy key từ keyring → giải mã data. Người dùng **không cần nhập password** (mục tiêu: mở app là dùng ngay, tự động giải mã).
  - Nếu keyring bị xóa/mất key → không giải mã được; app thông báo và hướng dẫn khôi phục từ **file backup key** (tùy chọn: cho phép export key ra file `.key` khi người dùng chủ động yêu cầu, cảnh báo rủi ro).
- **Format file dữ liệu** `%APPDATA%/note-quick-copy/notes.enc`:

```
MAGIC "NQC1" | version(u16) | nonce(12B) | ciphertext(AES-256-GCM) | auth_tag(16B)
```

- `ciphertext` = JSON payload nén (tuỳ chọn) chứa toàn bộ data.
- **Ghi an toàn:** ghi `notes.enc.tmp` → rename đè `notes.enc` (atomic); giữ bản `notes.enc.bak` của lần ghi trước.
- Key được `zeroize` sau khi dùng trong mỗi thao tác; không log key/nonce.
- **Lưu ý:** file **export JSON là plaintext** → cảnh báo người dùng trong dialog export; passphrase-protected export là mục backlog (v2).

---

## 6. Mô hình dữ liệu

```jsonc
// Payload plaintext (trước khi mã hóa)
{
  "schemaVersion": 1,
  "updatedAt": "2026-11-22T09:00:00Z",
  "groups": [
    {
      "id": "uuid",
      "name": "Snippets",
      "collapsed": false,
      "order": 0,              // thứ tự group trong grid
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "items": [
    {
      "id": "uuid",
      "groupId": "uuid",
      "content": "nội dung note (textarea)",
      "order": 0,               // thứ tự item trong group
      "createdAt": "...",
      "updatedAt": "...",
      "deletedAt": null         // != null → đang ở thùng rác
    }
  ]
}
```

- Xóa group: gắn `deletedAt` cho group + toàn bộ item con. Group bị xóa được lưu trong `trashedGroups` (tương tự) để hỗ trợ khôi phục.
- Purge 30 ngày: xóa vĩnh viễn mọi bản ghi có `deletedAt < now - 30d`.

### Schema file export/import

```jsonc
{ "app": "note-quick-copy", "schemaVersion": 1, "exportedAt": "...",
  "groups": [...], "items": [...], "trashedGroups": [...], "trashedItems": [...] }
```

---

## 7. UI / UX

```
┌────────────────────────────────────────────────────────────┐
│ Note Quick Copy   [+ New group]   [Import] [Export] [🗑 3] │  ← Toolbar
├────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────┐  ┌──────────────────────────┐ │
│ │ ▾ Snippets      ✎  🗑    │  │ ▾ Commands        ✎  🗑  │ │  ← grid 2 cột
│ │ ┌──────────────────────┐ │  │ ...                      │ │
│ │ │ Quick input…   [Add] │ │  └──────────────────────────┘ │
│ │ └──────────────────────┘ │                               │
│ │ ┌──────────────────────┐ │                               │
│ │ │ Item nội dung tối đa │ │                               │
│ │ │ 2 dòng    ⧉  ✎  🗑  │ │  ← item: copy / edit / delete │
│ │ └──────────────────────┘ │                               │
│ │ ┌────────────┐┌─────────┐│                               │
│ │ │ item cột 1 ││ cột 2   ││  ← group rộng: item chia 2 cột│
│ │ └────────────┘└─────────┘│                               │
│ └──────────────────────────┘                               │
└────────────────────────────────────────────────────────────┘
```

- Header group: icon mũi tên xoay theo trạng thái collapse; click tên hoặc icon → collapse/expand (animation nhẹ).
- Item: `line-clamp-2`, giữ nguyên khoảng trắng/xuống dòng; tooltip hiển thị đầy đủ khi hover.
- Nút item hiển thị dạng icon, luôn hiển thị (không hover-only) để copy nhanh nhất.
- Modal edit item: textarea chiếm toàn bộ, tự focus, đếm ký tự nhẹ.
- Empty states: chưa có group → hướng dẫn tạo group đầu tiên; group rỗng → gợi ý dùng quick input.

---

## 8. Roadmap

| Giai đoạn | Nội dung | Kết quả |
|---|---|---|
| **P1 — Foundation** | Scaffold Tauri 2 + Vite/React/TS/Tailwind/Zustand; model dữ liệu; lưu/giải mã + AES-GCM + keyring; autosave. | App mở, lưu data mã hóa, crash-safe. |
| **P2 — Core CRUD** | Tạo/đổi tên/xóa group; collapse/expand; quick input; item copy/edit modal/soft-delete; layout grid 2 cột + 2 cột trong group. | Đủ luồng sử dụng chính. |
| **P3 — Drag & Drop** | dnd-kit: reorder item, kéo item giữa các group, reorder group. | Sắp xếp linh hoạt, persist thứ tự. |
| **P4 — Trash & Import/Export** | Trash panel (khôi phục/xóa vĩnh viễn); purge 30 ngày; export/import JSON (replace/merge + validate + backup). | An toàn dữ liệu. |
| **P5 — Polish & Đóng gói** | Shortcut (Ctrl+N, Ctrl+F tìm kiếm — backlog), empty states, error handling, icon app, installer NSIS/MSI, test trên Windows 10 + 11. | Bản phát hành v1.0. |

### Backlog (sau v1.0)
- Tìm kiếm toàn cục (Ctrl+F), pin item, export có mật khẩu, dark mode, multi-window, sync qua file người dùng tự quản (OneDrive folder...).

---

## 9. Rủi ro & lưu ý

- **Mất key keyring** → mất khả năng giải mã: mitigations = backup key tùy chọn + bắt buộc có file `.bak`.
- **Export plaintext** → hiển thị cảnh báo rõ trong dialog.
- **Drag & drop + grid 2 cột**: cần test kỹ với nhóm item ít/nhiều, đảm bảo drop target không nhảy khi màn hẹp (1 cột).
- **Unikey/IME**: kiểm tra composition event không bị quick-input `Enter` nuốt sự kiện (kiểm `isComposing`).
- **Purge 30 ngày**: chỉ purge khi dữ liệu đã được persist an toàn; ghi log số bản bị xóa.
