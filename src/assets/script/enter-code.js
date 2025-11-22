document.addEventListener('DOMContentLoaded', () => {
    // Tìm tất cả các ô input có class 'otp-input'
    const inputs = document.querySelectorAll('.otp-input');

    // Nếu không tìm thấy ô nào, dừng script
    if (inputs.length === 0) return;

    // 4. Xử lý tự động điền OTP từ URL param
    const urlParams = new URLSearchParams(window.location.search);
    const otpParam = urlParams.get('otp');

    if (otpParam) {
        // Lấy 6 ký tự đầu tiên của OTP
        const otpCode = otpParam.slice(0, inputs.length).replace(/\D/g, ''); // Chỉ lấy số

        if (otpCode.length > 0) {
            // Điền vào các ô input
            otpCode.split('').forEach((char, index) => {
                if (inputs[index]) {
                    inputs[index].value = char;
                }
            });

            // Focus vào ô tiếp theo nếu chưa đủ 6 số, hoặc ô cuối cùng nếu đã đủ
            const nextIndex = Math.min(otpCode.length, inputs.length - 1);
            if (inputs[nextIndex]) {
                inputs[nextIndex].focus();
            }

            // Xóa param khỏi URL để tránh hiển thị lại
            urlParams.delete('otp');
            const newUrl =
                window.location.pathname +
                (urlParams.toString() ? '?' + urlParams.toString() : '') +
                window.location.hash;
            window.history.replaceState({}, '', newUrl);
        }
    }

    inputs.forEach((input, index) => {
        // 1. Tự động nhảy tới ô tiếp theo khi nhập
        input.addEventListener('input', (e) => {
            const target = e.target;
            const value = target.value;

            // Nếu đã nhập đủ 1 ký tự và không phải là ô cuối cùng
            if (
                value.length === target.maxLength &&
                index < inputs.length - 1
            ) {
                inputs[index + 1].focus();
            }
        });

        // 2. Tự động lùi về ô trước khi xóa
        input.addEventListener('keydown', (e) => {
            const target = e.target;

            // Nếu bấm Backspace và ô hiện tại đang rỗng
            if (e.key === 'Backspace' && target.value === '' && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });

    // 3. Xử lý khi dán (paste) code
    inputs[0].addEventListener('paste', (e) => {
        e.preventDefault(); // Ngăn hành động dán mặc định

        const pasteData = (e.clipboardData || window.clipboardData).getData(
            'text'
        );

        // Lấy số ký tự bằng số ô input
        const code = pasteData.slice(0, inputs.length);

        // Điền vào các ô input
        code.split('').forEach((char, index) => {
            if (inputs[index]) {
                inputs[index].value = char;
            }
        });

        // Focus vào ô cuối cùng đã điền
        const lastFilledIndex = Math.min(code.length, inputs.length) - 1;
        if (lastFilledIndex >= 0) {
            inputs[lastFilledIndex].focus();
        }
    });

    // 5. Xử lý form submit để verify OTP
    const form = document.querySelector('form');
    const continueButton = document.querySelector('.continue');
    const errorContainer = document.createElement('div');
    errorContainer.id = 'otp-error';
    errorContainer.style.cssText =
        'color: red; font-size: 1.4rem; margin-top: 1rem; text-align: center; min-height: 2rem;';
    if (form && continueButton) {
        form.insertBefore(errorContainer, continueButton);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Get email from URL query parameter
            const urlParams = new URLSearchParams(window.location.search);
            const email = urlParams.get('email');
            if (!email) {
                const errorMessage =
                    'Không tìm thấy email. Vui lòng thử lại từ đầu.';

                // Show toast dialog
                if (window.showToast) {
                    window.showToast({
                        title: 'Lỗi',
                        message: errorMessage,
                        type: 'error',
                        icon: '✕',
                        buttonText: 'Đóng',
                    });
                } else {
                    // Fallback to alert if toast is not available
                    alert(errorMessage);
                }

                // Also show in error container
                errorContainer.textContent = errorMessage;
                return;
            }

            // Collect OTP code from inputs
            const otpCode = Array.from(inputs)
                .map((input) => input.value)
                .join('');

            if (otpCode.length !== 6) {
                const errorMessage = 'Vui lòng nhập đủ 6 chữ số';

                // Show toast dialog
                if (window.showToast) {
                    window.showToast({
                        title: 'Thiếu thông tin',
                        message: errorMessage,
                        type: 'warning',
                        icon: '⚠',
                        buttonText: 'Đóng',
                    });
                } else {
                    // Fallback to alert if toast is not available
                    alert(errorMessage);
                }

                // Also show in error container
                errorContainer.textContent = errorMessage;
                return;
            }

            // Disable button and show loading
            if (continueButton instanceof HTMLButtonElement) {
                continueButton.disabled = true;
                const originalText = continueButton.textContent;
                continueButton.textContent = 'Đang xác thực...';

                try {
                    // Verify OTP
                    const response = await fetch('/api/auth/verify-otp', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: email,
                            token: otpCode,
                        }),
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Redirect to set-new-password page
                        const currentLang =
                            window.location.pathname.split('/')[1] || 'vi';
                        window.location.href = `/${currentLang}/set-new-password`;
                    } else {
                        const errorMessage =
                            result.error ||
                            result.message ||
                            'Mã OTP không hợp lệ. Vui lòng thử lại.';

                        // Show toast dialog
                        if (window.showToast) {
                            window.showToast({
                                title: 'Lỗi xác thực',
                                message: errorMessage,
                                type: 'error',
                                icon: '✕',
                                buttonText: 'Đóng',
                            });
                        } else {
                            // Fallback to alert if toast is not available
                            alert(errorMessage);
                        }

                        // Also show in error container
                        errorContainer.textContent = errorMessage;

                        // Clear inputs
                        inputs.forEach((input) => {
                            input.value = '';
                        });
                        inputs[0]?.focus();
                    }
                } catch (error) {
                    console.error('Error verifying OTP:', error);
                    const errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại.';

                    // Show toast dialog
                    if (window.showToast) {
                        window.showToast({
                            title: 'Lỗi',
                            message: errorMessage,
                            type: 'error',
                            icon: '✕',
                            buttonText: 'Đóng',
                        });
                    } else {
                        // Fallback to alert if toast is not available
                        alert(errorMessage);
                    }

                    // Also show in error container
                    errorContainer.textContent = errorMessage;
                } finally {
                    // Re-enable button
                    if (continueButton instanceof HTMLButtonElement) {
                        continueButton.disabled = false;
                        if (originalText) {
                            continueButton.textContent = originalText;
                        }
                    }
                }
            }
        });
    }

    // 6. Xử lý nút "Gửi lại" OTP
    const resentButton = document.querySelector('.resent');
    if (resentButton) {
        resentButton.addEventListener('click', async () => {
            // Get email from URL query parameter
            const urlParams = new URLSearchParams(window.location.search);
            const email = urlParams.get('email');
            const currentLang = window.location.pathname.split('/')[1] || 'vi';

            if (!email) {
                // Redirect to forgot-password page if no email
                window.location.href = `/${currentLang}/forgot-password`;
                return;
            }

            // Disable button and show loading
            if (resentButton instanceof HTMLButtonElement) {
                resentButton.disabled = true;
                const originalText = resentButton.textContent;
                resentButton.textContent = 'Đang gửi...';

                try {
                    // Call API to resend OTP
                    const formData = new FormData();
                    formData.append('email', email);

                    const response = await fetch(
                        `/api/auth/forgot-password?lang=${currentLang}`,
                        {
                            method: 'POST',
                            body: formData,
                        }
                    );

                    const result = await response.json();

                    if (result.success) {
                        // Show success toast
                        if (window.showToast) {
                            window.showToast({
                                title: 'Đã gửi lại mã OTP',
                                message:
                                    result.message ||
                                    'Chúng tôi đã gửi lại mã OTP đến email của bạn. Vui lòng kiểm tra hộp thư.',
                                type: 'success',
                                icon: '✉',
                                buttonText: 'Đóng',
                            });
                        } else {
                            alert(
                                result.message ||
                                    'Chúng tôi đã gửi lại mã OTP đến email của bạn.'
                            );
                        }
                    } else {
                        // Show error toast
                        const errorMessage =
                            result.error ||
                            result.message ||
                            'Không thể gửi lại mã OTP. Vui lòng thử lại.';

                        if (window.showToast) {
                            window.showToast({
                                title: 'Lỗi',
                                message: errorMessage,
                                type: 'error',
                                icon: '✕',
                                buttonText: 'Đóng',
                            });
                        } else {
                            alert(errorMessage);
                        }
                    }
                } catch (error) {
                    console.error('Error resending OTP:', error);
                    const errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại.';

                    if (window.showToast) {
                        window.showToast({
                            title: 'Lỗi',
                            message: errorMessage,
                            type: 'error',
                            icon: '✕',
                            buttonText: 'Đóng',
                        });
                    } else {
                        alert(errorMessage);
                    }
                } finally {
                    // Re-enable button
                    if (resentButton instanceof HTMLButtonElement) {
                        resentButton.disabled = false;
                        if (originalText) {
                            resentButton.textContent = originalText;
                        }
                    }
                }
            }
        });
    }
});
