document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            // 1. Xóa active cũ
            tabs.forEach((t) => t.classList.remove('active'));
            // 2. Thêm active mới
            tab.classList.add('active');

            // 3. Ẩn tất cả nội dung
            contents.forEach((content) => (content.style.display = 'none'));

            // 4. Hiện nội dung tương ứng
            const targetId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.style.display = 'grid';
            }
        });
    });
});
