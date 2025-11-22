document.addEventListener('DOMContentLoaded', () => {
    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);

    // Handle OAuth callback (check for hash fragment)
    const hash = window.location.hash.substring(1);
    if (hash) {
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        const currentLang = window.location.pathname.split('/')[1] || 'vi';

        if (error) {
            console.error('OAuth error:', error, errorDescription);
            window.location.href = `/${currentLang}/sign-up?error=oauth_failed`;
            return;
        }

        if (accessToken) {
            // Send token to server to create session
            fetch('/api/auth/oauth-callback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        // Redirect to dashboard
                        window.location.href = `/${currentLang}/dashboard`;
                    } else {
                        console.error('Error processing OAuth:', data.message);
                        window.location.href = `/${currentLang}/sign-up?error=processing_failed`;
                    }
                })
                .catch((error) => {
                    console.error('Error sending token to server:', error);
                    window.location.href = `/${currentLang}/sign-up?error=server_error`;
                });
            return; // Exit early, don't initialize form
        }
    }

    const form = $('#signup-form');

    if (form) {
        const validation = new window.JustValidate('#signup-form');
        const messages = window.signupValidationMessages || {};
        const uiMessages = window.signupUIMessages || {};

        validation
            .addField(
                '[name="fullName"]',
                [
                    {
                        rule: 'required',
                        errorMessage:
                            messages.fullNameRequired || 'Vui lòng nhập tên',
                    },
                    {
                        rule: 'minLength',
                        value: 3,
                        errorMessage:
                            messages.fullNameMinLength ||
                            'Tên phải có ít nhất 3 ký tự',
                    },
                    {
                        rule: 'maxLength',
                        value: 50,
                        errorMessage:
                            messages.fullNameMaxLength ||
                            'Tên không được vượt quá 50 ký tự',
                    },
                ],
                {
                    errorsContainer: '#fullName-error',
                }
            )
            .addField(
                '[name="username"]',
                [
                    {
                        rule: 'required',
                        errorMessage:
                            messages.usernameRequired ||
                            'Vui lòng nhập username',
                    },
                    {
                        rule: 'minLength',
                        value: 3,
                        errorMessage:
                            messages.usernameMinLength ||
                            'Username phải có ít nhất 3 ký tự',
                    },
                    {
                        rule: 'maxLength',
                        value: 20,
                        errorMessage:
                            messages.usernameMaxLength ||
                            'Username không được vượt quá 20 ký tự',
                    },
                ],
                {
                    errorsContainer: '#username-error',
                }
            )
            .addField(
                '[name="email"]',
                [
                    {
                        rule: 'required',
                        errorMessage:
                            messages.emailRequired || 'Vui lòng nhập email',
                    },
                    {
                        rule: 'email',
                        errorMessage:
                            messages.emailInvalid || 'Email không hợp lệ',
                    },
                ],
                {
                    errorsContainer: '#email-error',
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
            .addField(
                '[name="agree"]',
                [
                    {
                        validator: (value) => {
                            const checkbox = $('[name="agree"]');
                            return (
                                checkbox instanceof HTMLInputElement &&
                                checkbox.checked
                            );
                        },
                        errorMessage:
                            messages.agreeRequired ||
                            'Vui lòng đồng ý với điều khoản',
                    },
                ],
                {
                    errorsContainer: '#agree-error',
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
                        uiMessages.loading || 'Đang tạo tài khoản...';
                }

                try {
                    const response = await fetch('/api/auth/sign-up', {
                        method: 'POST',
                        body: formData,
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Redirect to home page after successful signup
                        const currentLang =
                            window.location.pathname.split('/')[1] || 'vi';
                        window.location.href = `/${currentLang}`;
                    } else {
                        // Clear previous errors
                        const fullNameErrorContainer = $('#fullName-error');
                        const usernameErrorContainer = $('#username-error');
                        const emailErrorContainer = $('#email-error');
                        const passwordErrorContainer = $('#password-error');
                        const agreeErrorContainer = $('#agree-error');

                        if (fullNameErrorContainer)
                            fullNameErrorContainer.textContent = '';
                        if (usernameErrorContainer)
                            usernameErrorContainer.textContent = '';
                        if (emailErrorContainer)
                            emailErrorContainer.textContent = '';
                        if (passwordErrorContainer)
                            passwordErrorContainer.textContent = '';
                        if (agreeErrorContainer)
                            agreeErrorContainer.textContent = '';

                        // Show error messages
                        const errorMessage =
                            result.error ||
                            result.message ||
                            uiMessages.error ||
                            'Tạo tài khoản thất bại';

                        if (typeof errorMessage === 'object') {
                            // Field-specific errors
                            if (
                                errorMessage.fullName &&
                                fullNameErrorContainer
                            ) {
                                fullNameErrorContainer.textContent =
                                    errorMessage.fullName;
                            }
                            if (
                                errorMessage.username &&
                                usernameErrorContainer
                            ) {
                                usernameErrorContainer.textContent =
                                    errorMessage.username;
                            }
                            if (errorMessage.email && emailErrorContainer) {
                                emailErrorContainer.textContent =
                                    errorMessage.email;
                            }
                            if (
                                errorMessage.password &&
                                passwordErrorContainer
                            ) {
                                passwordErrorContainer.textContent =
                                    errorMessage.password;
                            }
                        } else {
                            // General error
                            if (usernameErrorContainer) {
                                usernameErrorContainer.textContent =
                                    errorMessage;
                            }
                        }
                    }
                } catch (error) {
                    console.error('Signup error:', error);
                    // Clear previous errors
                    const fullNameErrorContainer = $('#fullName-error');
                    const usernameErrorContainer = $('#username-error');
                    const emailErrorContainer = $('#email-error');
                    const passwordErrorContainer = $('#password-error');
                    const agreeErrorContainer = $('#agree-error');

                    if (fullNameErrorContainer)
                        fullNameErrorContainer.textContent = '';
                    if (usernameErrorContainer)
                        usernameErrorContainer.textContent = '';
                    if (emailErrorContainer)
                        emailErrorContainer.textContent = '';
                    if (passwordErrorContainer)
                        passwordErrorContainer.textContent = '';
                    if (agreeErrorContainer)
                        agreeErrorContainer.textContent = '';

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
                window.location.href = `/${selectedLang}/sign-up`;
            }
        });
    }
});
