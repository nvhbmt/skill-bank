# Supabase local (môi trường dev)

Stack Supabase chạy bằng Docker để phát triển mà không cần đụng vào project thật.

## Chạy

```bash
npm run db:start     # khởi động Postgres + GoTrue + PostgREST + Storage + Studio
npm run db:reset     # tạo lại schema và nạp dữ liệu mock
npm run dev          # Astro tại http://localhost:4321
npm run db:stop      # dừng stack
```

`.env` đã trỏ sẵn vào stack local (`http://127.0.0.1:54321`). Khi deploy phải
thay bằng credentials thật của project Supabase.

| Dịch vụ | URL |
|---|---|
| API | http://127.0.0.1:54321 |
| Studio (xem/sửa dữ liệu) | http://127.0.0.1:54323 |
| Mailpit (xem email OTP) | http://127.0.0.1:54324 |
| Postgres | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

## Tài khoản mock

Tất cả dùng chung mật khẩu **`Password123`**. Đăng nhập bằng **username**, không phải email.

| Username | Vai trò | Ghi chú |
|---|---|---|
| `admin` | admin | Vào được `/vi/admin` để duyệt dự án |
| `viethoang` | user | Sở hữu 2 dự án, tham gia 1 dự án |
| `thimai` | user | Sở hữu dự án "Ứng dụng quản lý chi tiêu" |
| `minhduc` | user | Có đơn ứng tuyển đang chờ |
| `ngoclan` | user | Có đơn ứng tuyển đang chờ |

## Dữ liệu có sẵn

5 người dùng, 8 kỹ năng, 5 dự án (3 `approved`, 2 `pending` chờ admin duyệt),
mốc tiến độ, thành viên, 4 đơn ứng tuyển, 4 thông báo, 3 đánh giá và 2 bản bàn
giao (1 chờ duyệt, 1 đã nghiệm thu).

Muốn thử luồng bàn giao: đăng nhập `thimai` → `/vi/project-handover-collaborator`
để gửi bàn giao, rồi đăng nhập `viethoang` → `/vi/project-handover-manager/1` để
nghiệm thu hoặc trả lại.

## Cấu trúc

- `migrations/20250101000000_init_schema.sql` — 17 bảng, dựng lại từ
  `src/types/database.types.ts` (đây **không** phải bản dump production).
- `migrations/20250101000001_rls_and_storage.sql` — RLS nới lỏng cho dev (đọc mở,
  ghi yêu cầu đăng nhập) và 4 storage bucket: `project-covers`, `cover-images`,
  `cv-files`, `avatars`.
- `migrations/20250101000002_handover_and_cv.sql` — thêm `applications.cv_url` và
  bảng `project_handovers` cho luồng bàn giao. **Hai thay đổi này mới chỉ có ở
  local, cần chạy lại trên project production.**
- `seed.sql` — dữ liệu mock.

## Lưu ý

- Policy RLS ở đây **lỏng hơn production**. Đừng copy sang project thật.
- Khi sửa schema: thêm file mới vào `migrations/` rồi `npm run db:reset`, sau đó
  `npm run db:types` để sinh lại `src/types/database.types.ts`.
- Seed phải ép các cột token của `auth.users` về chuỗi rỗng, nếu để NULL thì
  GoTrue trả `Database error querying schema` khi đăng nhập.
