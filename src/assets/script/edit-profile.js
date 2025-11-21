document.addEventListener('DOMContentLoaded', () => {
    // === 1. XỬ LÝ PREVIEW & XÓA ẢNH ===
    function setupImagePreview(inputId, imgId, removeBtnId, defaultSrc) {
        const input = document.getElementById(inputId);
        const img = document.getElementById(imgId);
        const removeBtn = document.getElementById(removeBtnId);

        if (input && img) {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (!file.type.startsWith('image/')) {
                        alert('Vui lòng chọn file ảnh!');
                        return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                        alert('File ảnh quá lớn (Max 5MB)');
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        img.src = ev.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });

            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (confirm('Bạn có chắc muốn gỡ ảnh này?')) {
                        input.value = '';
                        img.src = defaultSrc;
                        const hiddenInput = document.getElementById(
                            'delete-' + inputId
                        );
                        if (hiddenInput) hiddenInput.value = 'true';
                    }
                });
            }
        }
    }

    setupImagePreview(
        'avatar-upload',
        'avatar-preview',
        'remove-avatar-btn',
        '/assets/images/default-avatar.png'
    );
    setupImagePreview(
        'cover-image-upload',
        'cover-image-preview',
        'remove-cover-btn',
        '/assets/images/background.png'
    );

    // === 2. XỬ LÝ KỸ NĂNG ===
    const addSkillBtn = document.getElementById('add-skill-btn');
    const skillSelect = document.getElementById('new-skill-select');
    const skillsContainer = document.getElementById('skills-container');

    function createSkillTag(id, name) {
        const span = document.createElement('span');
        span.className = 'skill-tag-edit';
        span.setAttribute('data-skill-id', id);
        span.innerHTML = `${name}<input type="checkbox" name="skill_ids" value="${id}" checked style="display:none;" /><button type="button" class="remove-skill-btn">×</button>`;
        span.querySelector('.remove-skill-btn').addEventListener('click', () =>
            span.remove()
        );
        return span;
    }

    if (addSkillBtn && skillSelect && skillsContainer) {
        addSkillBtn.addEventListener('click', () => {
            const selectedOption =
                skillSelect.options[skillSelect.selectedIndex];
            const skillId = skillSelect.value;
            const skillName = selectedOption.text.split(' (')[0];

            if (!skillId) {
                alert('Vui lòng chọn kỹ năng!');
                return;
            }
            if (skillsContainer.querySelector(`[data-skill-id="${skillId}"]`)) {
                alert('Kỹ năng này đã được thêm!');
                return;
            }

            skillsContainer.appendChild(createSkillTag(skillId, skillName));
            skillSelect.value = '';
        });
    }

    document.querySelectorAll('.remove-skill-btn').forEach((btn) => {
        btn.addEventListener('click', (e) =>
            e.target.closest('.skill-tag-edit').remove()
        );
    });

    // === 3. FORM SUBMIT ===
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
                submitButton.textContent = 'Đang lưu...';
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
                    alert(result.message || 'Lỗi cập nhật');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Lỗi kết nối.');
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                }
            }
        });
    }

    // === 4. REVIEW SLIDER (READ-ONLY) ===
    const track = document.getElementById('reviews-track');
    const slides = document.querySelectorAll('.review-slide');
    const dots = document.querySelectorAll('.dot');
    const container = document.getElementById('reviews-container');
    const viewport = document.querySelector('.reviews-viewport');

    if (track && slides.length > 0 && viewport) {
        let currentIndex = 0;
        let slideInterval;
        let startX = 0;
        let currentTranslate = 0;
        let prevTranslate = 0;
        let isDragging = false;
        const totalSlides = slides.length;

        function updateSliderPosition() {
            const slideWidth = slides[0].offsetWidth;
            const viewportWidth = viewport.offsetWidth;
            const centerViewport = viewportWidth / 2;
            const centerSlide = slideWidth / 2;
            const initialOffset = centerViewport - centerSlide;
            const translateX = initialOffset - currentIndex * slideWidth;

            currentTranslate = translateX;
            prevTranslate = translateX;
            track.style.transform = `translateX(${translateX}px)`;

            slides.forEach((slide, i) => {
                if (i === currentIndex) slide.classList.add('active');
                else slide.classList.remove('active');
            });

            dots.forEach((dot, i) => {
                if (i === currentIndex) dot.classList.add('active');
                else dot.classList.remove('active');
            });
        }

        function goToSlide(index) {
            if (index < 0) index = totalSlides - 1;
            if (index >= totalSlides) index = 0;
            currentIndex = index;
            updateSliderPosition();
        }

        function startAutoSlide() {
            stopAutoSlide();
            slideInterval = setInterval(() => {
                goToSlide(currentIndex + 1);
            }, 5000);
        }

        function stopAutoSlide() {
            clearInterval(slideInterval);
        }

        dots.forEach((dot) => {
            dot.addEventListener('click', (e) => {
                goToSlide(parseInt(e.target.dataset.index));
                startAutoSlide();
            });
        });

        track.addEventListener('touchstart', touchStart);
        track.addEventListener('touchmove', touchMove);
        track.addEventListener('touchend', touchEnd);
        track.addEventListener('mousedown', touchStart);
        track.addEventListener('mousemove', touchMove);
        track.addEventListener('mouseup', touchEnd);
        track.addEventListener('mouseleave', () => {
            if (isDragging) touchEnd();
        });

        function touchStart(e) {
            stopAutoSlide();
            isDragging = true;
            startX = e.type.includes('mouse')
                ? e.pageX
                : e.changedTouches[0].clientX;
            track.style.cursor = 'grabbing';
            track.style.transition = 'none';
        }

        function touchMove(e) {
            if (!isDragging) return;
            const currentX = e.type.includes('mouse')
                ? e.pageX
                : e.changedTouches[0].clientX;
            const diff = currentX - startX;
            track.style.transform = `translateX(${prevTranslate + diff}px)`;
        }

        function touchEnd() {
            isDragging = false;
            track.style.cursor = 'grab';
            track.style.transition =
                'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
            updateSliderPosition();
            startAutoSlide();
        }

        window.addEventListener('resize', updateSliderPosition);
        setTimeout(() => {
            goToSlide(0);
            startAutoSlide();
        }, 100);
    }
});
