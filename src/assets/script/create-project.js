// Hàm chung để tự động co dãn textarea
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

document.addEventListener('DOMContentLoaded', () => {
    // Load skills from API
    let skillsData = [];
    async function loadSkills() {
        try {
            const response = await fetch('/api/skills');
            const result = await response.json();
            if (result.success && result.data) {
                skillsData = result.data;
                populateSkillSelects();
                // Update SkillDetailDialog if it exists
                if (window.updateSkillDetailDialog) {
                    window.updateSkillDetailDialog(skillsData);
                }
            }
        } catch (error) {
            console.error('Error loading skills:', error);
        }
    }

    function populateSkillSelects() {
        const allSelects = document.querySelectorAll('.skill-select');
        allSelects.forEach((select) => {
            // Clear existing options except placeholder
            const placeholder = select.querySelector('option[disabled]');
            const currentValue = select.value;
            select.innerHTML = '';

            // Add placeholder
            if (placeholder) {
                select.appendChild(placeholder.cloneNode(true));
            } else {
                const placeholderOption = document.createElement('option');
                placeholderOption.value = '';
                placeholderOption.disabled = true;
                placeholderOption.selected = true;
                placeholderOption.hidden = true;
                placeholderOption.textContent = 'Chọn kỹ năng...';
                select.appendChild(placeholderOption);
            }

            // Add skills
            skillsData.forEach((skill) => {
                const option = document.createElement('option');
                option.value = skill.name.toLowerCase();
                option.textContent = skill.name;
                select.appendChild(option);
            });

            // Restore previous value if it exists
            if (currentValue) {
                select.value = currentValue;
            }
        });
    }

    // Load skills on page load
    loadSkills();

    // === HÀM TẠO NÚT XÓA CHUNG ===
    function createDeleteButton(onClick) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-delete'; // Class chung style
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Xóa mục này';
        deleteBtn.addEventListener('click', onClick);
        return deleteBtn;
    }

    // === 1. XỬ LÝ TIMELINE (MỐC THỜI GIAN) ===
    const milestoneList = document.getElementById('milestone-list');
    const addMilestoneButton = document.getElementById('add-milestone-btn');

    function updateMilestoneState() {
        const milestones = milestoneList.querySelectorAll('.milestone-item');
        const shouldShowDelete = milestones.length > 1;

        milestones.forEach((item, index) => {
            const newIndex = index + 1;

            // Cập nhật Input name/placeholder
            const textarea = item.querySelector('.milestone-input');
            if (textarea) {
                textarea.name = `milestone-${newIndex}`;
                textarea.placeholder = `Mốc ${newIndex}: ...`;
            }

            // Xử lý nút xóa
            let deleteBtn = item.querySelector('.btn-delete');

            if (shouldShowDelete) {
                if (!deleteBtn) {
                    deleteBtn = createDeleteButton(() => {
                        if (milestoneList.children.length > 1) {
                            item.remove();
                            updateMilestoneState();
                        }
                    });
                    deleteBtn.classList.add('btn-delete-milestone'); // Thêm class định vị
                    item.appendChild(deleteBtn); // Gắn cạnh input
                } else {
                    deleteBtn.style.display = 'flex';
                }
            } else {
                if (deleteBtn) deleteBtn.style.display = 'none';
            }
        });
    }

    if (addMilestoneButton && milestoneList) {
        addMilestoneButton.addEventListener('click', () => {
            const newItem = document.createElement('div');
            newItem.className = 'milestone-item';

            // Chỉ tạo Textarea
            const newTextarea = document.createElement('textarea');
            newTextarea.className = 'milestone-input auto-resize-textarea';
            newTextarea.rows = 1;
            newTextarea.addEventListener('input', () =>
                autoResizeTextarea(newTextarea)
            );

            newItem.appendChild(newTextarea);
            milestoneList.appendChild(newItem);

            newTextarea.focus();
            updateMilestoneState();
        });

        updateMilestoneState();
    }

    // === 2. XỬ LÝ KỸ NĂNG ===
    const addSkillButton = document.getElementById('add-skill-btn');
    const skillListContainer = document.getElementById('skill-list-container');

    function updateSkillState() {
        const skillItems = skillListContainer.querySelectorAll('.skill-item');
        const shouldShowDelete = skillItems.length > 1;

        skillItems.forEach((item, index) => {
            const newIndex = index + 1;

            const label = item.querySelector('label');
            if (label) {
                label.textContent = `Kỹ năng ${newIndex}`;
                label.setAttribute('for', `skill-${newIndex}`);
            }
            const select = item.querySelector('select');
            if (select) {
                select.id = `skill-${newIndex}`;
                select.name = `skill-${newIndex}`;
            }

            const labelWrapper = item.querySelector('.skill-label-wrapper');
            let deleteBtn = labelWrapper
                ? labelWrapper.querySelector('.btn-delete')
                : null;

            if (shouldShowDelete && labelWrapper) {
                if (!deleteBtn) {
                    deleteBtn = createDeleteButton(() => {
                        if (skillListContainer.children.length > 1) {
                            item.remove();
                            updateSkillState();
                        }
                    });
                    deleteBtn.classList.add('btn-delete-skill'); // Thêm class định vị
                    labelWrapper.appendChild(deleteBtn);
                } else {
                    deleteBtn.style.display = 'flex';
                }
            } else {
                if (deleteBtn) deleteBtn.style.display = 'none';
            }
        });
    }

    function setupDetailButton(button) {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const skillItem = button.closest('.skill-item');
            if (!skillItem) return;

            const skillIndex = button.getAttribute('data-skill-index');
            const skillSelect = skillItem.querySelector('.skill-select');
            const descriptionInput = skillItem.querySelector(
                '.skill-description-input'
            );

            const selectedSkill = skillSelect ? skillSelect.value : '';
            const currentDescription = descriptionInput
                ? descriptionInput.value
                : '';

            // Open dialog
            openSkillDetailDialog(
                selectedSkill,
                currentDescription,
                skillIndex,
                skillItem
            );
        });
    }

    function openSkillDetailDialog(
        selectedSkill,
        description,
        skillIndex,
        skillItem
    ) {
        const dialog = document.getElementById('skill-detail-dialog');
        const dialogSelect = document.getElementById('skill-detail-select');
        const dialogTextarea = document.getElementById(
            'skill-detail-description'
        );
        const saveBtn = document.getElementById('save-skill-detail');
        const closeBtn = document.getElementById('close-skill-dialog');
        const cancelBtn = document.getElementById('cancel-skill-dialog');

        if (!dialog || !dialogSelect || !dialogTextarea || !saveBtn) return;

        // Set current values
        if (dialogSelect) {
            dialogSelect.value = selectedSkill;
        }
        if (dialogTextarea) {
            dialogTextarea.value = description;
        }

        // Show dialog
        dialog.classList.add('active');

        // Save handler
        const saveHandler = () => {
            const newSkill = dialogSelect.value;
            const newDescription = dialogTextarea.value.trim();

            // Update skill select if changed
            const skillSelect = skillItem.querySelector('.skill-select');
            if (skillSelect && newSkill) {
                skillSelect.value = newSkill;
            }

            // Update description input
            const descriptionInput = skillItem.querySelector(
                '.skill-description-input'
            );
            if (descriptionInput) {
                descriptionInput.value = newDescription;
            }

            // Update button state
            const detailButton = skillItem.querySelector('.btn-skill-detail');
            if (detailButton) {
                if (newDescription) {
                    detailButton.classList.add('filled');
                } else {
                    detailButton.classList.remove('filled');
                }
            }

            closeSkillDetailDialog();
        };

        // Close handler
        const closeHandler = () => {
            closeSkillDetailDialog();
        };

        // Remove old listeners
        saveBtn.replaceWith(saveBtn.cloneNode(true));
        closeBtn.replaceWith(closeBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));

        // Get new elements
        const newSaveBtn = document.getElementById('save-skill-detail');
        const newCloseBtn = document.getElementById('close-skill-dialog');
        const newCancelBtn = document.getElementById('cancel-skill-dialog');

        // Add new listeners
        newSaveBtn.addEventListener('click', saveHandler);
        newCloseBtn.addEventListener('click', closeHandler);
        newCancelBtn.addEventListener('click', closeHandler);

        // Close on overlay click
        const overlay = dialog.querySelector('.skill-detail-dialog-overlay');
        if (overlay) {
            overlay.replaceWith(overlay.cloneNode(true));
            const newOverlay = dialog.querySelector(
                '.skill-detail-dialog-overlay'
            );
            newOverlay.addEventListener('click', closeHandler);
        }
    }

    function closeSkillDetailDialog() {
        const dialog = document.getElementById('skill-detail-dialog');
        if (dialog) {
            dialog.classList.remove('active');
        }
    }

    if (addSkillButton && skillListContainer) {
        skillListContainer
            .querySelectorAll('.btn-skill-detail')
            .forEach(setupDetailButton);
        updateSkillState();

        addSkillButton.addEventListener('click', () => {
            const items = skillListContainer.querySelectorAll('.skill-item');
            const lastItem = items[items.length - 1];
            if (!lastItem) return;

            const newItem = lastItem.cloneNode(true);
            const select = newItem.querySelector('select');
            if (select) {
                select.value = '';
                // Populate skills if not already populated
                if (select.options.length <= 1 && skillsData.length > 0) {
                    const placeholder =
                        select.querySelector('option[disabled]');
                    select.innerHTML = '';
                    if (placeholder) {
                        select.appendChild(placeholder.cloneNode(true));
                    }
                    skillsData.forEach((skill) => {
                        const option = document.createElement('option');
                        option.value = skill.name.toLowerCase();
                        option.textContent = skill.name;
                        select.appendChild(option);
                    });
                }
                // Update select id and name
                const newIndex = skillListContainer.children.length + 1;
                select.id = `skill-${newIndex}`;
                select.name = `skill-${newIndex}`;
            }

            // Update description input
            const descriptionInput = newItem.querySelector(
                '.skill-description-input'
            );
            if (descriptionInput) {
                const newIndex = skillListContainer.children.length + 1;
                descriptionInput.name = `skill-${newIndex}-description`;
                descriptionInput.value = '';
            }

            const detailBtn = newItem.querySelector('.btn-skill-detail');
            if (detailBtn) {
                detailBtn.classList.remove('filled');
                const newIndex = skillListContainer.children.length + 1;
                detailBtn.setAttribute('data-skill-index', newIndex.toString());
                setupDetailButton(detailBtn);
            }

            const oldDelete = newItem.querySelector('.btn-delete');
            if (oldDelete) oldDelete.remove();

            skillListContainer.appendChild(newItem);
            updateSkillState();
        });
    }

    // === 3. XỬ LÝ UPLOAD ẢNH (LOGIC KẾT HỢP) ===
    const coverUpload = document.getElementById('coverUpload');
    const coverPreview = document.getElementById('cover-preview');
    const coverPreviewImg = document.getElementById('cover-preview-img');
    const btnRemoveCover = document.getElementById('btn-remove-cover');
    // Thêm cả phần hiển thị link tên file
    const coverFileNameLink = document.getElementById('cover-file-name');

    if (coverUpload && coverPreview && coverPreviewImg && coverFileNameLink) {
        coverUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                // 1. Xử lý Preview Ảnh (nếu là ảnh)
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        coverPreviewImg.src = e.target.result;
                        coverPreview.hidden = false;

                        // Ẩn hộp upload box
                        const uploadBox = document.querySelector('.upload-box');
                        if (uploadBox) uploadBox.style.display = 'none';
                    };
                    reader.readAsDataURL(file);
                }

                // 2. Xử lý Link Tên File
                const fileUrl = URL.createObjectURL(file);
                coverFileNameLink.textContent = file.name;
                coverFileNameLink.href = fileUrl;
                coverFileNameLink.download = file.name;
                coverFileNameLink.hidden = false;
            }
        });

        if (btnRemoveCover) {
            btnRemoveCover.addEventListener('click', (e) => {
                e.preventDefault();
                coverUpload.value = '';

                // Reset Preview
                coverPreviewImg.src = '';
                coverPreview.hidden = true;

                // Reset Link Tên File
                coverFileNameLink.textContent = '';
                coverFileNameLink.hidden = true;

                // Hiện lại hộp upload box
                const uploadBox = document.querySelector('.upload-box');
                if (uploadBox) uploadBox.style.display = 'flex';
            });
        }
    }

    // === 4. AUTO RESIZE & FORM ===
    document.querySelectorAll('.auto-resize-textarea').forEach((textarea) => {
        textarea.addEventListener('input', () => autoResizeTextarea(textarea));
        autoResizeTextarea(textarea);
    });

    const form = document.getElementById('project-form');
    if (form && window.JustValidate) {
        const validation = new window.JustValidate('#project-form');
        // ... Rules cũ ...
        validation
            .addField('[name="project_name"]', [{ rule: 'required' }])
            .addField('[name="category"]', [{ rule: 'required' }])
            .addField('[name="start_date"]', [{ rule: 'required' }])
            .onSuccess(async (event) => {
                if (event && event.preventDefault) event.preventDefault();
                const formData = new FormData(form);
                const submitButton = form.querySelector(
                    'button[type="submit"]'
                );
                const originalText = submitButton?.textContent;
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = 'Đang xử lý...';
                }
                try {
                    const response = await fetch('/api/projects/create', {
                        method: 'POST',
                        body: formData,
                    });
                    const result = await response.json();
                    if (result.success) {
                        const lang =
                            window.location.pathname.split('/')[1] || 'vi';
                        window.location.href = `/${lang}/project/${result.data.project_id}`;
                    } else {
                        if (window.showToast) {
                            window.showToast({
                                type: 'error',
                                title: 'Lỗi',
                                message: result.message || 'Lỗi',
                            });
                        }
                    }
                } catch (error) {
                    if (window.showToast) {
                        window.showToast({
                            type: 'error',
                            title: 'Lỗi',
                            message: 'Lỗi kết nối.',
                        });
                    }
                } finally {
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = originalText;
                    }
                }
            });
    }
});
