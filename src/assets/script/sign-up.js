document.addEventListener('DOMContentLoaded', () => {
    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);

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
});

