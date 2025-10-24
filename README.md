# Skill Bank - Dự án Astro

Dự án Skill Bank được xây dựng bằng Astro framework với cấu trúc tối ưu cho việc phát triển web hiện đại.

## 🚀 Cấu trúc dự án

Dự án Astro của bạn có cấu trúc thư mục như sau:

```text
/
├── public/                 # Thư mục chứa các file tĩnh
│   └── favicon.svg
├── src/                    # Thư mục mã nguồn chính
│   ├── assets/            # Tài nguyên (CSS, JS, hình ảnh)
│   │   ├── css/           # File CSS
│   │   └── script/        # File JavaScript
│   ├── components/        # Các component Astro
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── layouts/           # Layout templates
│   │   └── Layout.astro
│   └── pages/             # Các trang web
│       ├── index.astro     # Trang chủ
│       ├── about.astro     # Trang giới thiệu
│       └── contact.astro   # Trang liên hệ
├── astro.config.mjs       # Cấu hình Astro
├── tsconfig.json          # Cấu hình TypeScript
└── package.json           # Thông tin dự án và dependencies
```

## 🔧 Cấu hình Alias

Dự án đã được cấu hình alias để import dễ dàng hơn:

- `@` → `/src` (alias chính)

### Ví dụ sử dụng alias:

```astro
<!-- Import layout -->
import Layout from '@/layouts/Layout.astro';

<!-- Import component -->
import Header from '@/components/Header.astro';

<!-- Import script -->
<script src="@/assets/script/index.js"></script>

<!-- Import CSS -->
import '@/assets/css/main.css';
```

## 📋 Các lệnh chính

Tất cả các lệnh được chạy từ thư mục gốc của dự án:

| Lệnh                    | Mô tả                                           |
| :---------------------- | :---------------------------------------------- |
| `npm install`           | Cài đặt các dependencies                        |
| `npm run dev`           | Khởi động server phát triển tại `localhost:4321` |
| `npm run build`         | Build dự án production vào thư mục `./dist/`    |
| `npm run preview`       | Xem trước build trước khi deploy                |
| `npm run astro ...`     | Chạy các lệnh CLI như `astro add`, `astro check` |
| `npm run astro -- --help` | Xem trợ giúp sử dụng Astro CLI                 |

## 🎯 Tính năng chính

- ✅ **Astro Framework**: Framework web hiện đại với hiệu suất cao
- ✅ **TypeScript Support**: Hỗ trợ TypeScript đầy đủ
- ✅ **Path Aliases**: Cấu hình alias để import dễ dàng
- ✅ **Component-based**: Kiến trúc component linh hoạt
- ✅ **SEO Friendly**: Tối ưu cho SEO và hiệu suất

## 📚 Tài liệu tham khảo

- [Tài liệu Astro chính thức](https://docs.astro.build)
- [Hướng dẫn cấu trúc dự án Astro](https://docs.astro.build/en/basics/project-structure/)
- [Cộng đồng Discord Astro](https://astro.build/chat)

## 🚀 Bắt đầu phát triển

1. Clone dự án
2. Chạy `npm install` để cài đặt dependencies
3. Chạy `npm run dev` để khởi động server phát triển
4. Mở trình duyệt tại `http://localhost:4321`

Chúc bạn phát triển vui vẻ! 🎉