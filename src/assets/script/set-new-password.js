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

    // Xử lý form submit để set password mới
    const form = document.querySelector('form');
    const submitButton = document.querySelector('.reset');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    if (form && submitButton) {
        const errorContainer = document.createElement('div');
        errorContainer.id = 'password-error';
        errorContainer.style.cssText =
            'color: red; font-size: 1.4rem; margin-top: 1rem; text-align: center; min-height: 2rem;';
        form.insertBefore(errorContainer, submitButton);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!passwordInput || !confirmPasswordInput) return;

            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Clear previous error
            errorContainer.textContent = '';

            // Basic validation
            if (!password || !confirmPassword) {
                errorContainer.textContent = 'Vui lòng nhập đầy đủ thông tin';
                return;
            }

            if (password.length < 8) {
                errorContainer.textContent = 'Mật khẩu phải có ít nhất 8 ký tự';
                return;
            }

            if (password !== confirmPassword) {
                errorContainer.textContent = 'Mật khẩu xác nhận không khớp';
                return;
            }

            // Disable button and show loading
            if (submitButton instanceof HTMLButtonElement) {
                submitButton.disabled = true;
                const originalText = submitButton.textContent;
                submitButton.textContent = 'Đang xử lý...';

                try {
                    // Set new password
                    const response = await fetch('/api/auth/set-password', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            password: password,
                            confirmPassword: confirmPassword,
                        }),
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Show success dialog
                        showSuccessDialog();
                    } else {
                        errorContainer.textContent =
                            result.error ||
                            result.message ||
                            'Không thể đặt mật khẩu mới. Vui lòng thử lại.';
                    }
                } catch (error) {
                    console.error('Error setting password:', error);
                    errorContainer.textContent =
                        'Có lỗi xảy ra. Vui lòng thử lại.';
                } finally {
                    // Re-enable button
                    if (submitButton instanceof HTMLButtonElement) {
                        submitButton.disabled = false;
                        if (originalText) {
                            submitButton.textContent = originalText;
                        }
                    }
                }
            }
        });
    }
});

// Function to show success dialog
function showSuccessDialog() {
    const currentLang = window.location.pathname.split('/')[1] || 'vi';
    const dialog = document.getElementById('success-dialog');
    if (dialog) {
        dialog.classList.add('active');
    }
}

// Function to close dialog and redirect to home
function closeSuccessDialog() {
    const dialog = document.getElementById('success-dialog');
    if (dialog) {
        dialog.classList.remove('active');
        const currentLang = window.location.pathname.split('/')[1] || 'vi';
        window.location.href = `/${currentLang}/`;
    }
}

// Make functions available globally
window.closeSuccessDialog = closeSuccessDialog;
