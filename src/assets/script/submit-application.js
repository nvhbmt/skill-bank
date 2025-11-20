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
                uploadList.innerHTML = `
                    <div class="upload-item">
                        <div class="upload-item-info">
                            <img src="/assets/images/solar_file-outline.svg" alt="icon" />
                            <span class="upload-item-name">${file.name}</span>
                        </div>
                        <span class="upload-item-success"></span>
                    </div>
                `;
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
                alert(result.message || 'Gửi đơn ứng tuyển thành công!');
                
                // Redirect to project detail page
                const projectId = formData.get('project_id');
                const lang = window.location.pathname.split('/')[1];
                window.location.href = `/${lang}/project-detail/${projectId}`;
            } else {
                // Show error message
                alert(result.message || 'Có lỗi xảy ra khi gửi đơn ứng tuyển');
                
                // Re-enable button
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                }
            }
        } catch (error) {
            console.error('Error submitting application:', error);
            alert('Có lỗi xảy ra khi gửi đơn ứng tuyển. Vui lòng thử lại.');
            
            // Re-enable button
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        }
    });
});

