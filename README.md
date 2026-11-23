# Note Quick Copy

Ứng dụng ghi chú nhanh dạng group/item, tối ưu cho việc **copy nội dung bằng 1 click**, hoạt động **offline trên Windows 10/11**, dữ liệu được **mã hóa AES-256-GCM khi lưu trữ**.

> Xem chi tiết yêu cầu trong [PLAN.md](./PLAN.md).

## Tính năng

- **Group / Item**: tạo nhiều group, mỗi group chứa nhiều item (chỉ 1 trường `content`).
- **Quick input**: ô nhập nhanh ở đầu mỗi group — `Enter` tạo item, `Shift+Enter` xuống dòng, `Escape` xóa trắng.
- **Copy 1 click**: nút copy trên mỗi item, feedback "Copied!" (icon đổi 1-2s).
- **Edit popup**: click nội dung item → modal xem/sửa đầy đủ (`Ctrl+Enter` lưu, `Esc` đóng).
- **Drag & drop**: kéo đổi thứ tự item, kéo item sang group khác, kéo đổi thứ tự group (@dnd-kit).
- **Layout responsive**: grid 2 cột cho group (≥1024px), item trong group tự chia tối đa 2 cột khi rộng.
- **Thùng rác**: soft delete, khôi phục, xóa vĩnh viễn; tự purge sau 30 ngày.
- **Import/Export JSON**: export plaintext (có cảnh báo); import Replace/Merge theo `updatedAt`, validate schema.
- **Mã hóa at-rest**: AES-256-GCM, key lưu trong Windows Credential Manager (keyring), ghi file atomic + giữ bản `.bak`.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Backend | Rust, Tauri 2, `aes-gcm`, `keyring`, `tauri-plugin-dialog`, `tauri-plugin-clipboard-manager` |
| Frontend | Vite, React 18, TypeScript, Tailwind CSS |
| State | Zustand (persist qua IPC) |
| Khác | @dnd-kit/core + sortable, @radix-ui/react-dialog, lucide-react |

## Cấu trúc file dữ liệu

- File mã hóa: `%APPDATA%/note-quick-copy/notes.enc`
- Format: `MAGIC "NQC1" | version (u16) | nonce (12B) | ciphertext (AES-256-GCM) | auth tag (16B)`
- Backup: `notes.enc.bak` (bản ghi trước đó), ghi atomic qua `notes.enc.tmp` + rename.
- Lưu ý: **key nằm trong OS keyring** — nếu mất key, file `.enc` không thể giải mã. File export JSON là **plaintext**.

## Chạy từ nguồn

Yêu cầu: Node.js ≥ 18, Rust toolchain (stable), Windows 10/11 x64.

```bash
npm install

# Dev mode (hot reload)
npm run tauri dev

# Build installer (.exe NSIS / .msi)
npm run tauri build
```

Chỉ build frontend: `npm run build`. Chỉ kiểm tra backend: `cargo check` (trong `src-tauri/`).

Link tải: https://drive.google.com/file/d/1VCNklhOsuUhJlZ5ptMjjwLorMg3kxbcO/view?usp=drive_link
https://drive.google.com/file/d/1vL0MQTlnNmf0SjKfvHiRuJ-33WYWmXCJ/view?usp=drive_link

## License

MIT
