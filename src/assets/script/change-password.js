document.addEventListener('DOMContentLoaded', () => {
    const messages = window.changePasswordMessages || {};

    // --- Nút con mắt bật/tắt hiện mật khẩu (giữ nguyên hành vi cũ) ---
    document.querySelectorAll('.toggle-password').forEach((toggle) => {
        const wrapper = toggle.closest('.password-wrapper');
        const input = wrapper ? wrapper.querySelector('input') : null;
        const iconEye = toggle.querySelector('.icon-eye');
        const iconEyeSlash = toggle.querySelector('.icon-eye-slash');

        if (!input || !iconEye || !iconEyeSlash) return;

        toggle.addEventListener('mousedown', (e) => e.preventDefault());

        toggle.addEventListener('click', () => {
            const selectionStart = input.selectionStart;
            const selectionEnd = input.selectionEnd;
            const showing = input.type === 'password';

            input.type = showing ? 'text' : 'password';
            iconEye.style.display = showing ? 'block' : 'none';
            iconEyeSlash.style.display = showing ? 'none' : 'block';

            setTimeout(() => {
                input.focus();
                input.setSelectionRange(selectionStart, selectionEnd);
            }, 0);
        });
    });

    // --- Gửi form đổi mật khẩu ---
    const form = document.getElementById('change-password-form');
    if (!form) return;

    const errorBox = document.getElementById('change-password-error');
    const submitButton = form.querySelector('button[type="submit"]');

    function showError(text) {
        if (!errorBox) return;
        errorBox.textContent = text || '';
        errorBox.style.display = text ? 'block' : 'none';
    }

    function setBusy(busy) {
        if (!submitButton) return;
        submitButton.disabled = busy;
        submitButton.textContent = busy
            ? messages.submitting || 'Đang xử lý...'
            : messages.submit || 'Đặt lại mật khẩu';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showError('');
        setBusy(true);

        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                body: new FormData(form),
            });
            const result = await response.json();

            if (result.success) {
                form.reset();
                if (window.showToast) {
                    window.showToast({
                        type: 'success',
                        title: messages.successTitle || 'Thành công',
                        message:
                            result.message ||
                            messages.success ||
                            'Đổi mật khẩu thành công',
                        onClose: () => {
                            window.location.href =
                                messages.redirectTo || '/vi/dashboard';
                        },
                    });
                } else {
                    window.location.href =
                        messages.redirectTo || '/vi/dashboard';
                }
                return;
            }

            // error là map {tên trường: thông báo} khi Zod chặn, hoặc chuỗi
            let text = result.message || messages.genericError;
            if (result.error && typeof result.error === 'object') {
                const first = Object.values(result.error)[0];
                if (first) text = first;
            } else if (typeof result.error === 'string') {
                text = result.error;
            }
            showError(text);
        } catch (error) {
            console.error('Error changing password:', error);
            showError(
                messages.genericError || 'Có lỗi xảy ra, vui lòng thử lại'
            );
        } finally {
            setBusy(false);
        }
    });
});
