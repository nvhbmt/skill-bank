document.addEventListener('DOMContentLoaded', () => {
    const $ = document.querySelector.bind(document);

    const form = $('#forgot-password-form');
    const emailInput = $('#email');
    const errorContainer = $('#email-error');
    const successMessage = $('#success-message');

    if (form) {
        // Initialize JustValidate if available
        if (window.JustValidate) {
            const validation = new window.JustValidate('#forgot-password-form');

            validation
                .addField(
                    '[name="email"]',
                    [
                        {
                            rule: 'required',
                            errorMessage: 'Vui lòng nhập email',
                        },
                        {
                            rule: 'email',
                            errorMessage: 'Email không hợp lệ',
                        },
                    ],
                    {
                        errorsContainer: '#email-error',
                    }
                )
                .onSuccess(async (event) => {
                    event.preventDefault();
                    await handleSubmit();
                });
        } else {
            // Fallback: basic form handling without JustValidate
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                await handleSubmit();
            });
        }
    }

    async function handleSubmit() {
        if (!form || !emailInput) return;

        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton?.textContent;

        // Clear previous messages
        if (errorContainer) errorContainer.textContent = '';
        if (successMessage) successMessage.style.display = 'none';

        // Disable button and show loading state
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Đang gửi...';
        }

        try {
            const formData = new FormData(form);
            const currentLang = window.location.pathname.split('/')[1] || 'vi';

            const response = await fetch(
                `/api/auth/forgot-password?lang=${currentLang}`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            const result = await response.json();

            if (result.success) {
                // Get email value
                const emailValue = emailInput?.value;

                // Show success dialog
                showOtpSentDialog(
                    result.message ||
                        'Chúng tôi đã gửi mã OTP đến email của bạn. Vui lòng kiểm tra hộp thư.',
                    emailValue,
                    currentLang
                );
            } else {
                // Show error message
                const errorText =
                    result.error ||
                    result.message ||
                    'Có lỗi xảy ra, vui lòng thử lại';

                if (errorContainer) {
                    errorContainer.textContent = errorText;
                    errorContainer.style.color = 'red';
                } else if (successMessage) {
                    successMessage.textContent = errorText;
                    successMessage.style.display = 'block';
                    successMessage.style.color = 'red';
                }
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            const errorText = 'Có lỗi xảy ra, vui lòng thử lại';

            if (errorContainer) {
                errorContainer.textContent = errorText;
                errorContainer.style.color = 'red';
            } else if (successMessage) {
                successMessage.textContent = errorText;
                successMessage.style.display = 'block';
                successMessage.style.color = 'red';
            }
        } finally {
            // Re-enable button
            if (submitButton) {
                submitButton.disabled = false;
                if (originalButtonText) {
                    submitButton.textContent = originalButtonText;
                }
            }
        }
    }

    // Function to show OTP sent dialog
    function showOtpSentDialog(message, email, lang) {
        const dialog = document.getElementById('otp-sent-dialog');
        const messageEl = document.getElementById('otp-sent-message');

        if (dialog && messageEl) {
            messageEl.textContent = message;
            dialog.classList.add('active');

            // Store email and lang for redirect
            if (dialog) {
                dialog.dataset.redirectEmail = email || '';
                dialog.dataset.redirectLang = lang || 'vi';
            }
        }
    }

    // Function to close dialog and redirect
    function closeOtpSentDialog() {
        const dialog = document.getElementById('otp-sent-dialog');
        if (dialog) {
            dialog.classList.remove('active');
            const email = dialog.dataset.redirectEmail || '';
            const lang = dialog.dataset.redirectLang || 'vi';

            // Redirect to enter-code page with email in URL
            if (email) {
                window.location.href = `/${lang}/enter-code?email=${encodeURIComponent(email)}`;
            } else {
                window.location.href = `/${lang}/enter-code`;
            }
        }
    }

    // Make function available globally
    window.closeOtpSentDialog = closeOtpSentDialog;
});
