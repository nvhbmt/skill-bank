document.addEventListener('DOMContentLoaded', () => {
    // Tìm tất cả các nút toggle (icon)
    const toggles = document.querySelectorAll('.toggle-password');

    toggles.forEach((toggle) => {
        // Tìm input ngay bên trong .password-wrapper
        const input = toggle
            .closest('.password-wrapper')
            .querySelector('input');
        const iconEye = toggle.querySelector('.icon-eye');
        const iconEyeSlash = toggle.querySelector('.icon-eye-slash');

        // Đảm bảo tìm thấy mọi thứ
        if (!input || !iconEye || !iconEyeSlash) return;

        // Giữ nguyên: Ngăn input mất focus khi bấm
        toggle.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });

        // Gắn sự kiện click
        toggle.addEventListener('click', () => {
            // 1. Lưu lại vị trí con trỏ
            const selectionStart = input.selectionStart;
            const selectionEnd = input.selectionEnd;

            // Kiểm tra loại của input
            if (input.type === 'password') {
                // Nếu là 'password', đổi sang 'text'
                input.type = 'text';
                // Đổi icon
                iconEye.style.display = 'block';
                iconEyeSlash.style.display = 'none';
            } else {
                // Nếu là 'text', đổi về 'password'
                input.type = 'password';
                // Đổi icon
                iconEye.style.display = 'none';
                iconEyeSlash.style.display = 'block';
            }

            // 2. Phục hồi lại focus và vị trí con trỏ (bên trong setTimeout)
            // Dùng setTimeout(..., 0) để đảm bảo trình duyệt
            // đã render xong thay đổi 'type' trước khi ta đặt lại con trỏ.
            setTimeout(() => {
                input.focus(); // Đảm bảo input vẫn đang focus
                input.setSelectionRange(selectionStart, selectionEnd); // Đặt lại vị trí
            }, 0); // Trì hoãn 0 mili giây (để nó chạy ở "tick" tiếp theo)
        });
    });
});
