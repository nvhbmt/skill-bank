// Hàm chung để tự động co dãn textarea
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

document.addEventListener('DOMContentLoaded', () => {
    // === 1. XỬ LÝ TIMELINE (MỐC THỜI GIAN) ===
    const addMilestoneButton = document.getElementById('add-milestone-btn');
    const milestoneList = document.getElementById('milestone-list');

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

            newItem.appendChild(newTextarea);
            milestoneList.appendChild(newItem);
            newTextarea.focus();
        });
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
    const coverFileNameLink = document.getElementById('cover-file-name'); // Sửa: Giờ là thẻ <a>

    if (coverUpload && coverFileNameLink) {
        coverUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                // Tạo URL tạm thời cho file (dùng cho href)
                const fileUrl = URL.createObjectURL(file);

                // Gán thuộc tính cho thẻ <a>
                coverFileNameLink.textContent = file.name; // Hiển thị tên file
                coverFileNameLink.href = fileUrl; // Link để xem/tải
                coverFileNameLink.download = file.name; // Tên file khi tải
                coverFileNameLink.hidden = false; // Hiện link lên
            } else {
                // Reset nếu user hủy
                coverFileNameLink.textContent = '';
                coverFileNameLink.href = '#';
                coverFileNameLink.hidden = true;
            }
        });
    } else {
        console.error('Lỗi: Không tìm thấy Input File hoặc <a> tên file.');
    }

    // === 4. XỬ LÝ CO DÃN TEXTAREA (CHO CÁC Ô CÓ SẴN) ===
    document.querySelectorAll('.auto-resize-textarea').forEach((textarea) => {
        textarea.addEventListener('input', () => autoResizeTextarea(textarea));
        autoResizeTextarea(textarea);
    });
});
