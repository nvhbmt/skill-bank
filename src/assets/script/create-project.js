// Hàm chung để tự động co dãn textarea
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

document.addEventListener('DOMContentLoaded', () => {
    // === 1. XỬ LÝ TIMELINE (MỐC THỜI GIAN) ===
    const addMilestoneButton = document.getElementById('add-milestone-btn');
    const milestoneList = document.getElementById('milestone-list');

    // Hàm cập nhật số thứ tự và placeholder của các milestone
    function updateMilestoneNumbers() {
        const milestones = milestoneList.querySelectorAll('.milestone-item');
        milestones.forEach((item, index) => {
            const textarea = item.querySelector('.milestone-input');
            if (textarea) {
                const newIndex = index + 1;
                textarea.name = `milestone-${newIndex}`;
                textarea.placeholder = `Mốc ${newIndex}: ...`;
            }
        });
        // Cập nhật hiển thị nút xóa
        updateDeleteButtonsVisibility();
    }

    // Hàm cập nhật hiển thị nút xóa (chỉ hiện khi có nhiều hơn 1 milestone)
    function updateDeleteButtonsVisibility() {
        const milestones = milestoneList.querySelectorAll('.milestone-item');
        const shouldShowDelete = milestones.length > 1;
        milestones.forEach((item) => {
            const deleteBtn = item.querySelector('.btn-delete-milestone');
            if (deleteBtn) {
                deleteBtn.style.display = shouldShowDelete ? 'flex' : 'none';
            }
        });
    }

    // Hàm tạo nút xóa milestone
    function createDeleteButton(milestoneItem) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-delete-milestone';
        deleteBtn.innerHTML = '×';
        deleteBtn.setAttribute('aria-label', 'Xóa mốc thời gian');
        deleteBtn.addEventListener('click', () => {
            // Chỉ cho phép xóa nếu còn nhiều hơn 1 milestone
            if (milestoneList.children.length > 1) {
                milestoneItem.remove();
                updateMilestoneNumbers();
            }
        });
        return deleteBtn;
    }

    if (addMilestoneButton && milestoneList) {
        addMilestoneButton.addEventListener('click', () => {
            const currentCount = milestoneList.children.length;
            const newIndex = currentCount + 1;

            const newItem = document.createElement('div');
            newItem.className = 'milestone-item';

            const newTextarea = document.createElement('textarea');
            newTextarea.name = `milestone-${newIndex}`;
            newTextarea.className = 'milestone-input auto-resize-textarea';
            newTextarea.placeholder = `Mốc ${newIndex}: ...`;
            newTextarea.rows = 1;

            newTextarea.addEventListener('input', () =>
                autoResizeTextarea(newTextarea)
            );

            // Thêm nút xóa
            const deleteBtn = createDeleteButton(newItem);
            newItem.appendChild(newTextarea);
            newItem.appendChild(deleteBtn);
            milestoneList.appendChild(newItem);
            newTextarea.focus();

            // Thêm nút xóa vào milestone đầu tiên nếu chưa có
            const firstMilestone = milestoneList.querySelector(
                '.milestone-item:first-child'
            );
            if (
                firstMilestone &&
                !firstMilestone.querySelector('.btn-delete-milestone')
            ) {
                const firstDeleteBtn = createDeleteButton(firstMilestone);
                firstMilestone.appendChild(firstDeleteBtn);
            }

            // Cập nhật hiển thị nút xóa
            updateDeleteButtonsVisibility();
        });

        // Thêm nút xóa vào tất cả milestones khi trang load
        const initialMilestones = milestoneList.querySelectorAll(
            '.milestone-item'
        );
        initialMilestones.forEach((item) => {
            if (!item.querySelector('.btn-delete-milestone')) {
                const deleteBtn = createDeleteButton(item);
                item.appendChild(deleteBtn);
            }
        });

        // Cập nhật hiển thị nút xóa ban đầu
        updateDeleteButtonsVisibility();
    } else {
        console.error('Lỗi: Không tìm thấy nút Timeline hoặc List.');
    }

    // === 2. XỬ LÝ THÊM KỸ NĂNG ===
    const addSkillButton = document.getElementById('add-skill-btn');
    const skillListContainer = document.getElementById('skill-list-container');

    if (addSkillButton && skillListContainer) {
        addSkillButton.addEventListener('click', () => {
            const currentCount = skillListContainer.children.length;
            const newIndex = currentCount + 1;

            const firstSkillGroup =
                skillListContainer.querySelector('.form-group');
            if (!firstSkillGroup) return;

            const newSkillGroup = firstSkillGroup.cloneNode(true);

            const newLabel = newSkillGroup.querySelector('label');
            if (newLabel) {
                newLabel.htmlFor = `skill-${newIndex}`;
                newLabel.textContent = `Kỹ năng ${newIndex}`;
            }

            const newSelect = newSkillGroup.querySelector('select');
            if (newSelect) {
                newSelect.id = `skill-${newIndex}`;
                newSelect.name = `skill-${newIndex}`;
                newSelect.value = '';
            }

            skillListContainer.appendChild(newSkillGroup);
        });
    } else {
        console.error('Lỗi: Không tìm thấy nút Kỹ năng hoặc List.');
    }

    // === 3. XỬ LÝ ẢNH BÌA (ĐÃ CẬP NHẬT) ===
    const coverUpload = document.getElementById('coverUpload');
    const coverFileNameLink = document.getElementById('cover-file-name');
    const coverPreview = document.getElementById('cover-preview');
    const coverPreviewImg = document.getElementById('cover-preview-img');
    const btnRemoveCover = document.getElementById('btn-remove-cover');

    // Hàm hiển thị preview ảnh
    function showCoverPreview(file) {
        if (!file || !file.type.startsWith('image/')) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            coverPreviewImg.src = e.target.result;
            coverPreview.hidden = false;

            // Ẩn upload box khi có preview
            const uploadBox = document.querySelector('.upload-box');
            if (uploadBox) {
                uploadBox.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    }

    // Hàm xóa preview và reset
    function removeCoverPreview() {
        // Xóa file khỏi input
        if (coverUpload) {
            coverUpload.value = '';
        }

        // Ẩn preview
        if (coverPreview) {
            coverPreview.hidden = true;
        }
        if (coverPreviewImg) {
            coverPreviewImg.src = '';
        }

        // Hiện lại upload box
        const uploadBox = document.querySelector('.upload-box');
        if (uploadBox) {
            uploadBox.style.display = 'flex';
        }

        // Reset file name link
        if (coverFileNameLink) {
            coverFileNameLink.textContent = '';
            coverFileNameLink.href = '#';
            coverFileNameLink.hidden = true;
        }
    }

    if (coverUpload && coverPreview && coverPreviewImg) {
        coverUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                // Tạo URL tạm thời cho file (dùng cho href)
                const fileUrl = URL.createObjectURL(file);

                // Hiển thị preview
                showCoverPreview(file);

                // Gán thuộc tính cho thẻ <a>
                if (coverFileNameLink) {
                    coverFileNameLink.textContent = file.name;
                    coverFileNameLink.href = fileUrl;
                    coverFileNameLink.download = file.name;
                    coverFileNameLink.hidden = false;
                }
            } else {
                removeCoverPreview();
            }
        });

        // Cho phép click vào preview để chọn ảnh mới
        coverPreviewImg.addEventListener('click', () => {
            if (coverUpload) {
                coverUpload.click();
            }
        });

        // Xử lý nút xóa preview
        if (btnRemoveCover) {
            btnRemoveCover.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                removeCoverPreview();
            });
        }
    } else {
        console.error(
            'Lỗi: Không tìm thấy các element cần thiết cho upload ảnh bìa.'
        );
    }

    // === 4. XỬ LÝ CO DÃN TEXTAREA (CHO CÁC Ô CÓ SẴN) ===
    document.querySelectorAll('.auto-resize-textarea').forEach((textarea) => {
        textarea.addEventListener('input', () => autoResizeTextarea(textarea));
        autoResizeTextarea(textarea);
    });

    // === 5. XỬ LÝ FORM SUBMISSION ===
    const form = document.getElementById('project-form');
    if (form) {
        const validation = new window.JustValidate('#project-form');

        validation
            .addField('[name="project_name"]', [
                {
                    rule: 'required',
                    errorMessage: 'Vui lòng nhập tên dự án',
                },
                {
                    rule: 'minLength',
                    value: 1,
                    errorMessage: 'Tên dự án không được để trống',
                },
                {
                    rule: 'maxLength',
                    value: 200,
                    errorMessage: 'Tên dự án không được vượt quá 200 ký tự',
                },
            ])
            .addField('[name="category"]', [
                {
                    rule: 'required',
                    errorMessage: 'Vui lòng chọn phân loại dự án',
                },
            ])
            .addField('[name="start_date"]', [
                {
                    rule: 'required',
                    errorMessage: 'Vui lòng chọn thời gian bắt đầu',
                },
            ])
            .addField('[name="terms"]', [
                {
                    rule: 'required',
                    errorMessage: 'Bạn phải đồng ý với chính sách',
                },
            ])
            .onSuccess(async (event) => {
                event.preventDefault();

                const formData = new FormData(form);
                const submitButton = form.querySelector('button[type="submit"]');
                const originalButtonText = submitButton?.textContent;

                // Disable button and show loading state
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = 'Đang tạo dự án...';
                }

                try {
                    const response = await fetch('/api/projects/create', {
                        method: 'POST',
                        body: formData,
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Redirect to project page or home
                        const currentLang =
                            window.location.pathname.split('/')[1] || 'vi';
                        window.location.href = `/${currentLang}/project-search`;
                    } else {
                        // Show error message
                        alert(result.message || 'Có lỗi xảy ra khi tạo dự án');
                        if (result.error) {
                            console.error('Validation errors:', result.error);
                        }
                    }
                } catch (error) {
                    console.error('Error submitting form:', error);
                    alert('Có lỗi xảy ra khi tạo dự án. Vui lòng thử lại.');
                } finally {
                    // Re-enable button
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = originalButtonText;
                    }
                }
            });
    }
});
