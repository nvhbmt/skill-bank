document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    let projectsData = null;
    let currentLang = window.location.pathname.split('/')[1] || 'vi';

    // Helper function to format date
    function formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        } catch {
            return dateString;
        }
    }

    // Load projects from API
    async function loadProjects() {
        if (projectsData) return projectsData;

        try {
            const response = await fetch('/api/my-projects');
            const result = await response.json();

            if (result.success && result.data) {
                projectsData = result.data;
                renderAllTabs();
                return projectsData;
            } else {
                showError('Không thể tải dự án');
                return null;
            }
        } catch (error) {
            console.error('Error loading projects:', error);
            showError('Lỗi khi tải dự án');
            return null;
        }
    }

    // Render project card
    function renderProjectCard(project, statusColor) {
        const visibleMembers = project.members.slice(0, 3);
        const remainingCount = project.members.length - 3;
        const formattedDate = formatDate(project.created_at);

        return `
            <a href="/${currentLang}/project/${project.id}" class="project-card">
                <div class="card-header">
                    <h3 class="card-title">${escapeHtml(project.title)}</h3>
                    <div class="card-info-row">
                        <div class="member-avatars">
                            ${visibleMembers
                                .map(
                                    (member) => `
                                <img
                                    src="${member.avatar_url || '/assets/images/defaul-project-background.jpg'}"
                                    alt="Member"
                                    class="avatar-img"
                                />
                            `
                                )
                                .join('')}
                            ${remainingCount > 0 ? `<div class="avatar-more">+${remainingCount}</div>` : ''}
                        </div>
                        <span class="project-date">${formattedDate}</span>
                    </div>
                </div>
                <div class="card-status-row">
                    <span class="status-label">Trạng thái</span>
                    <span class="status-indicator ${statusColor}"></span>
                </div>
            </a>
        `;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    // Render all tabs
    function renderAllTabs() {
        if (!projectsData) return;

        const statusColors = {
            pending: 'status-orange',
            approved: 'status-green',
            joined: 'status-green',
            completed: 'status-blue',
            rejected: 'status-red',
        };

        ['pending', 'approved', 'joined', 'completed', 'rejected'].forEach(
            (tabId) => {
                const container = document.getElementById(tabId);
                const loading = document.getElementById(`${tabId}-loading`);
                const projects = projectsData[tabId] || [];

                if (loading) loading.style.display = 'none';

                if (container) {
                    if (projects.length === 0) {
                        container.innerHTML = `
                        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--color-text-gray);">
                            Không có dự án nào
                        </div>
                    `;
                    } else {
                        container.innerHTML = projects
                            .map((project) =>
                                renderProjectCard(project, statusColors[tabId])
                            )
                            .join('');
                    }
                }
            }
        );
    }

    function showError(message) {
        ['pending', 'approved', 'joined', 'completed', 'rejected'].forEach(
            (tabId) => {
                const container = document.getElementById(tabId);
                const loading = document.getElementById(`${tabId}-loading`);
                if (loading) loading.style.display = 'none';
                if (container) {
                    container.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--color-text-gray);">
                        ${message}
                    </div>
                `;
                }
            }
        );
    }

    // Tab switching
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

    // Load projects on page load
    loadProjects();
});
