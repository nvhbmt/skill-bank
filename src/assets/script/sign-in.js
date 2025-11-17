document.addEventListener('DOMContentLoaded', () => {
    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);

    const form = $('#login-form');

    if (form) {
        const validation = new window.JustValidate('#login-form');
        const messages = window.loginValidationMessages || {};
        const uiMessages = window.loginUIMessages || {};

        validation
            .addField(
                '[name="username"]',
                [
                    {
                        rule: 'required',
                        errorMessage:
                            messages.usernameRequired ||
                            'Vui lòng nhập tên đăng nhập',
                    },
                    {
                        rule: 'minLength',
                        value: 3,
                        errorMessage:
                            messages.usernameMinLength ||
                            'Username phải có ít nhất 3 ký tự',
                    },
                ],
                {
                    errorsContainer: '#username-error',
                }
            )
            .addField(
                '[name="password"]',
                [
                    {
                        rule: 'required',
                        errorMessage:
                            messages.passwordRequired ||
                            'Vui lòng nhập mật khẩu',
                    },
                    {
                        rule: 'minLength',
                        value: 8,
                        errorMessage:
                            messages.passwordMinLength ||
                            'Mật khẩu phải có ít nhất 8 ký tự',
                    },
                ],
                {
                    errorsContainer: '#password-error',
                }
            )
            .onSuccess(async (event) => {
                event.preventDefault();

                const formData = new FormData(form);
                const submitButton = form.querySelector(
                    'button[type="submit"]'
                );
                const originalButtonText = submitButton?.textContent;

                // Disable button and show loading state
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent =
                        uiMessages.loading || 'Đang đăng nhập...';
                }

                try {
                    const response = await fetch('/api/auth/sign-in', {
                        method: 'POST',
                        body: formData,
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Redirect to home page after successful login
                        const currentLang =
                            window.location.pathname.split('/')[1] || 'vi';
                        window.location.href = `/${currentLang}`;
                    } else {
                        // Clear previous errors
                        const usernameErrorContainer = $('#username-error');
                        const passwordErrorContainer = $('#password-error');
                        if (usernameErrorContainer)
                            usernameErrorContainer.textContent = '';
                        if (passwordErrorContainer)
                            passwordErrorContainer.textContent = '';

                        // Show error message
                        const errorMessage =
                            result.error ||
                            result.message ||
                            uiMessages.error ||
                            'Đăng nhập thất bại';
                        const errorText =
                            typeof errorMessage === 'string'
                                ? errorMessage
                                : typeof errorMessage === 'object' &&
                                    errorMessage.username
                                  ? errorMessage.username
                                  : 'Thông tin đăng nhập không hợp lệ';

                        // Display error in username error container
                        if (usernameErrorContainer) {
                            usernameErrorContainer.textContent = errorText;
                        }
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    // Clear previous errors
                    const usernameErrorContainer = $('#username-error');
                    const passwordErrorContainer = $('#password-error');
                    if (usernameErrorContainer)
                        usernameErrorContainer.textContent = '';
                    if (passwordErrorContainer)
                        passwordErrorContainer.textContent = '';

                    // Show error
                    if (usernameErrorContainer) {
                        usernameErrorContainer.textContent =
                            uiMessages.errorGeneric ||
                            'Có lỗi xảy ra, vui lòng thử lại';
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
            });
    }

    // Handle language selector
    const langSelector = $('#lang-selector');
    if (langSelector) {
        langSelector.addEventListener('change', (e) => {
            const target = e.target;
            if (target instanceof HTMLSelectElement) {
                const selectedLang = target.value;
                window.location.href = `/${selectedLang}/sign-in`;
            }
        });
    }
});

