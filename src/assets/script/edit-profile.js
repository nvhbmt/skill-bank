document.addEventListener('DOMContentLoaded', () => {
    // Handle toggle add skill dialog
    const tablerPlusBtn = document.querySelector('.tabler-plus-wrapper');
    const addSkillDialog = document.getElementById('add-skill-dialog');
    const closeDialogBtn = document.getElementById('close-add-skill-dialog');
    const dialogContent = addSkillDialog?.querySelector('.add-skill-dialog');

    // Open dialog
    if (tablerPlusBtn && addSkillDialog) {
        tablerPlusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addSkillDialog.style.display = 'flex';
            // Focus on select after showing
            setTimeout(() => {
                const skillSelect = document.getElementById('new-skill-select');
                if (skillSelect) {
                    skillSelect.focus();
                }
            }, 100);
        });
    }

    // Close dialog functions
    const closeDialog = () => {
        if (addSkillDialog) {
            addSkillDialog.style.display = 'none';
        }
    };

    // Close button
    if (closeDialogBtn) {
        closeDialogBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeDialog();
        });
    }

    // Close on overlay click
    if (addSkillDialog) {
        addSkillDialog.addEventListener('click', (e) => {
            if (e.target === addSkillDialog) {
                closeDialog();
            }
        });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && addSkillDialog?.style.display === 'flex') {
            closeDialog();
        }
    });

    // Prevent dialog content clicks from closing
    if (dialogContent) {
        dialogContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Handle avatar preview
    const avatarUpload = document.getElementById('avatar-upload');
    const avatarPreview = document.getElementById('avatar-preview');
    const avatarOverlay = document.querySelector('.avatar-overlay');
    const avtVa = document.querySelector('.avt-va');

    if (avatarUpload && avatarPreview && avtVa) {
        // Show overlay on hover
        avtVa.addEventListener('mouseenter', () => {
            if (avatarOverlay) {
                avatarOverlay.style.opacity = '1';
            }
        });

        avtVa.addEventListener('mouseleave', () => {
            if (avatarOverlay) {
                avatarOverlay.style.opacity = '0';
            }
        });

        // Handle file selection
        avatarUpload.addEventListener('change', (e) => {
            const target = e.target;
            const file = target.files?.[0];

            if (file) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    alert('Vui lòng chọn file ảnh');
                    target.value = '';
                    return;
                }

                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('File ảnh quá lớn. Vui lòng chọn file nhỏ hơn 5MB');
                    target.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    const result = event.target?.result;
                    if (result && avatarPreview) {
                        avatarPreview.src = result;
                        avatarPreview.style.display = 'block';
                    }
                };
                reader.onerror = () => {
                    alert('Lỗi khi đọc file ảnh');
                    target.value = '';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Handle adding new skill
    const addSkillBtn = document.getElementById('add-skill-btn');
    const skillSelect = document.getElementById('new-skill-select');
    const skillsContainer = document.getElementById('skills-container');

    function createSkillElement(skillId, skillName) {
        // Create checkbox input
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'skill_ids';
        checkbox.value = skillId;
        checkbox.checked = true;
        checkbox.style.cssText =
            'position: absolute; top: 0; left: 0; opacity: 0; pointer-events: none;';

        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-skill-btn';
        removeBtn.innerHTML = '×';
        removeBtn.style.cssText =
            'position: absolute; top: -8px; right: -8px; background: rgba(220, 38, 38, 0.9); border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 50%; width: 24px; height: 24px; color: white; cursor: pointer; font-size: 14px; font-weight: bold; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.4); z-index: 10;';
        removeBtn.setAttribute('aria-label', 'Xóa kỹ năng');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const span = removeBtn.parentElement;
            if (span) {
                // Add option back to select
                const option = document.createElement('option');
                option.value = skillId;
                option.textContent = skillName;
                if (skillSelect) {
                    skillSelect.appendChild(option);
                }
                span.remove();
            }
        });

        // Create skill span
        const skillSpan = document.createElement('span');
        const skillCount =
            skillsContainer?.querySelectorAll('.frame-18, .frame-19').length ||
            0;
        skillSpan.className = skillCount % 2 === 0 ? 'frame-18' : 'frame-19';
        skillSpan.style.cssText = 'position: relative; cursor: pointer;';
        skillSpan.setAttribute('data-skill-id', skillId);
        skillSpan.setAttribute('data-skill-name', skillName);
        skillSpan.appendChild(checkbox);
        skillSpan.appendChild(removeBtn);

        const textSpan = document.createElement('span');
        textSpan.className = 'text-wrapper-11';
        textSpan.textContent = skillName;
        skillSpan.appendChild(textSpan);

        return skillSpan;
    }

    if (addSkillBtn && skillSelect && skillsContainer) {
        addSkillBtn.addEventListener('click', () => {
            const selectedSkillId = skillSelect.value;
            if (!selectedSkillId) return;

            const selectedOption =
                skillSelect.options[skillSelect.selectedIndex];
            const skillName = selectedOption.text;

            // Create and add skill element
            const skillElement = createSkillElement(selectedSkillId, skillName);
            skillsContainer.appendChild(skillElement);

            // Remove from select
            selectedOption.remove();
            skillSelect.value = '';

            // Close dialog after adding skill
            const dialog = document.getElementById('add-skill-dialog');
            if (dialog) {
                dialog.style.display = 'none';
            }
        });
    }

    // Handle removing existing skills
    document.querySelectorAll('.remove-skill-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const span = e.target.closest('span[data-skill-id]');
            if (span) {
                const skillId = span.getAttribute('data-skill-id');
                const skillName = span.getAttribute('data-skill-name');

                // Uncheck the checkbox
                const checkbox = span.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = false;
                    checkbox.remove();
                }

                // Add option back to select if it exists
                if (skillId && skillName && skillSelect) {
                    const option = document.createElement('option');
                    option.value = skillId;
                    option.textContent = skillName;
                    skillSelect.appendChild(option);
                }

                // Remove the span
                span.remove();
            }
        });
    });

    // Handle cover image preview
    const coverImageUpload = document.getElementById('cover-image-upload');
    const coverImagePreview = document.getElementById('cover-image-preview');
    const coverImageOverlay = document.querySelector('.cover-image-overlay');
    const coverImageLabel = document.querySelector(
        'label[for="cover-image-upload"]'
    );

    if (coverImageUpload && coverImagePreview && coverImageLabel) {
        // Show overlay on hover
        coverImageLabel.addEventListener('mouseenter', () => {
            if (coverImageOverlay) {
                coverImageOverlay.style.opacity = '1';
            }
        });

        coverImageLabel.addEventListener('mouseleave', () => {
            if (coverImageOverlay) {
                coverImageOverlay.style.opacity = '0';
            }
        });

        // Handle file selection
        coverImageUpload.addEventListener('change', (e) => {
            const target = e.target;
            const file = target.files?.[0];

            if (file) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    alert('Vui lòng chọn file ảnh');
                    target.value = '';
                    return;
                }

                // Validate file size (max 10MB for cover images)
                if (file.size > 10 * 1024 * 1024) {
                    alert('File ảnh quá lớn. Vui lòng chọn file nhỏ hơn 10MB');
                    target.value = '';
                    return;
                }

                // Preview image using FileReader (only for display, not saved to form)
                const reader = new FileReader();
                reader.onload = (event) => {
                    const result = event.target?.result;
                    if (result && coverImagePreview) {
                        // Update preview only (file will be uploaded via form submission)
                        if (coverImagePreview.tagName === 'IMG') {
                            coverImagePreview.src = result;
                        } else {
                            // Replace div with img
                            const img = document.createElement('img');
                            img.id = 'cover-image-preview';
                            img.className = 'rectangle';
                            img.src = result;
                            img.alt = 'Ảnh bìa';
                            img.style.cssText =
                                'width: 100%; height: 300px; object-fit: cover; border-radius: 20px; transition: all 0.3s ease; display: block;';
                            coverImagePreview.replaceWith(img);
                        }
                    }
                };
                reader.onerror = () => {
                    alert('Lỗi khi đọc file ảnh');
                    target.value = '';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Update full name display when input changes
    const fullNameInput = document.getElementById('full-name-input');
    const userFullname = document.getElementById('user-fullname');
    if (fullNameInput && userFullname) {
        fullNameInput.addEventListener('input', (e) => {
            const value = e.target.value;
            if (value) {
                userFullname.textContent = value;
            }
        });
    }

    // Handle form submission
    const editProfileForm = document.getElementById('edit-profile-form');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitButton = editProfileForm.querySelector(
                'button[type="submit"]'
            );
            const originalText = submitButton?.textContent;
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Đang xử lý...';
            }

            try {
                const formData = new FormData(editProfileForm);
                const response = await fetch('/api/profile/update', {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();

                if (result.success) {
                    const lang = window.location.pathname.split('/')[1] || 'vi';
                    window.location.href = `/${lang}/profile/${result.data.username}`;
                } else {
                    alert(result.message || 'Lỗi khi cập nhật profile');
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('Lỗi kết nối. Vui lòng thử lại.');
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                }
            }
        });
    }
});
