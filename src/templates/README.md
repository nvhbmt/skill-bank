# Email Templates

## OTP Reset Password Template

Template email HTML cho việc gửi mã OTP khôi phục mật khẩu, được thiết kế theo style trang chủ SkillBank với dark theme và purple gradient.

### Cách sử dụng

#### Option 1: Sử dụng với Supabase Dashboard

1. Truy cập Supabase Dashboard → Authentication → Email Templates
2. Chọn template "Magic Link" hoặc "Password Reset"
3. Copy nội dung từ file `email-otp-reset.html` và paste vào editor
4. Thay thế các placeholder:
   - `{{OTP_CODE}}` - sẽ được Supabase tự động thay thế bằng `{{ .Token }}` hoặc `{{ .TokenHash }}`
   - `{{EXPIRY_MINUTES}}` - thay bằng số phút (ví dụ: 10)
   - `{{LOGO_URL}}` - URL logo của bạn (ví dụ: `https://yourdomain.com/assets/images/logo.png`)
   - `{{RESET_URL}}` - URL trang xác thực (ví dụ: `https://yourdomain.com/vi/enter-code`)
   - `{{SITE_URL}}` - URL trang chủ

**Lưu ý**: Supabase sử dụng Go templates, nên bạn cần thay đổi cú pháp:
- `{{OTP_CODE}}` → `{{ .Token }}` hoặc `{{ .TokenHash }}`
- Các biến khác có thể hardcode hoặc sử dụng biến môi trường

#### Option 2: Sử dụng với Email Service khác (Resend, SendGrid, etc.)

Sử dụng utility function `getOTPResetEmailTemplate()` từ `src/utils/email-template.ts`:

```typescript
import { getOTPResetEmailTemplate } from '@/utils/email-template';

const emailHtml = getOTPResetEmailTemplate({
    otpCode: '123456',
    expiryMinutes: 10,
    logoUrl: 'https://yourdomain.com/assets/images/logo.png',
    resetUrl: 'https://yourdomain.com/vi/enter-code',
    siteUrl: 'https://yourdomain.com',
    lang: 'vi', // hoặc 'en'
});

// Gửi email với service của bạn
await emailService.send({
    to: userEmail,
    subject: 'Mã OTP Khôi Phục Mật Khẩu - SkillBank',
    html: emailHtml,
});
```

### Placeholders

- `{{OTP_CODE}}` - Mã OTP 6 chữ số
- `{{EXPIRY_MINUTES}}` - Số phút mã OTP có hiệu lực (mặc định: 10)
- `{{LOGO_URL}}` - URL logo SkillBank
- `{{RESET_URL}}` - URL trang nhập mã OTP
- `{{SITE_URL}}` - URL trang chủ

### Design Features

- Dark theme (#0f0f1a) giống trang chủ
- Purple gradient colors (#7c3aed, #a78bfa, #c4b5fd)
- Glass morphism effect với backdrop-filter
- Grid overlay pattern
- Responsive design
- Inline CSS cho email client compatibility
- Table-based layout cho Outlook support

### Customization

Để tùy chỉnh template:

1. Màu sắc: Tìm và thay thế các giá trị hex color
2. Font: Thay đổi `font-family` trong inline styles
3. Logo: Cập nhật `{{LOGO_URL}}` hoặc thay bằng base64 image
4. Nội dung: Chỉnh sửa text trong template

### Testing

Để test template:

1. Sử dụng tool như [Litmus](https://litmus.com/) hoặc [Email on Acid](https://www.emailonacid.com/)
2. Test trên các email clients phổ biến: Gmail, Outlook, Apple Mail, etc.
3. Kiểm tra responsive trên mobile

