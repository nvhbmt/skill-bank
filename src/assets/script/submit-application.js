document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('submit-application-form');
    const cvUpload = document.getElementById('cv-upload');
    const uploadList = document.getElementById('upload-list');

    if (!form) return;

    // Handle CV file upload display
    if (cvUpload && uploadList) {
        cvUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Tên file do người dùng đặt, không ghép thẳng vào innerHTML
                uploadList.innerHTML = '';

                const item = document.createElement('div');
                item.className = 'upload-item';

                const info = document.createElement('div');
                info.className = 'upload-item-info';

                const icon = document.createElement('img');
                icon.src = '/assets/images/solar_file-outline.svg';
                icon.alt = 'icon';
                info.appendChild(icon);

                const name = document.createElement('span');
                name.className = 'upload-item-name';
                name.textContent = file.name;
                info.appendChild(name);

                const success = document.createElement('span');
                success.className = 'upload-item-success';

                item.appendChild(info);
                item.appendChild(success);
                uploadList.appendChild(item);
            }
        });
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton?.textContent;

        // Disable button and show loading state
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Đang gửi...';
        }

        try {
            const response = await fetch('/api/applications/submit', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                // Show success message
                if (window.showToast) {
                    window.showToast({
                        type: 'success',
                        title: 'Thành công',
                        message:
                            result.message || 'Gửi đơn ứng tuyển thành công!',
                        onClose: () => {
                            // Redirect to project detail page
                            const projectId = formData.get('project_id');
                            const lang = window.location.pathname.split('/')[1];
                            window.location.href = `/${lang}/project/${projectId}`;
                        },
                    });
                } else {
                    // Fallback: redirect directly
                    const projectId = formData.get('project_id');
                    const lang = window.location.pathname.split('/')[1];
                    window.location.href = `/${lang}/project/${projectId}`;
                }
            } else {
                // Show error message
                if (window.showToast) {
                    window.showToast({
                        type: 'error',
                        title: 'Lỗi',
                        message:
                            result.message ||
                            'Có lỗi xảy ra khi gửi đơn ứng tuyển',
                    });
                }

                // Re-enable button
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                }
            }
        } catch (error) {
            console.error('Error submitting application:', error);
            if (window.showToast) {
                window.showToast({
                    type: 'error',
                    title: 'Lỗi',
                    message:
                        'Có lỗi xảy ra khi gửi đơn ứng tuyển. Vui lòng thử lại.',
                });
            }

            // Re-enable button
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        }
    });
});
