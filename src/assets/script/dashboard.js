document.addEventListener('DOMContentLoaded', () => {
    const currentLang = window.location.pathname.split('/')[1] || 'vi';
    let dashboardData = null;

    // Translation helper
    const t = (key) => {
        // You can extend this with actual translations
        const translations = {
            'dashboard.viewAll': 'Xem tất cả',
            'dashboard.completeProfile': 'Hoàn thiện hồ sơ',
            'dashboard.profileImpressive': 'Hồ sơ ấn tượng! Thêm chứng chỉ để đạt 100%.',
            'dashboard.profileGood': 'Hồ sơ tốt! Hoàn thiện thêm để tăng điểm.',
            'dashboard.profileIncomplete': 'Hãy hoàn thiện hồ sơ để có nhiều cơ hội hơn.',
            'dashboard.act_applied': 'Đã ứng tuyển',
            'dashboard.act_posted': 'Đã đăng',
            'dashboard.act_joined': 'Đã tham gia',
        };
        return translations[key] || key;
    };

    // Load dashboard data
    async function loadDashboardData() {
        try {
            const response = await fetch('/api/dashboard');
            const result = await response.json();

            if (result.success && result.data) {
                dashboardData = result.data;
                renderDashboard();
            } else {
                showError('Không thể tải dữ liệu dashboard');
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            showError('Lỗi khi tải dữ liệu dashboard');
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    function renderDashboard() {
        if (!dashboardData) return;

        renderRecommendedProjects();
        renderTrendingSkills();
        renderProfileStrength();
        renderActivities();
    }

    function renderRecommendedProjects() {
        const container = document.getElementById('recommended-projects');
        if (!container) return;

        const projects = dashboardData.recommendedProjects || [];
        const loading = container.querySelector('.projects-loading');

        if (loading) loading.style.display = 'none';

        if (projects.length === 0) {
            container.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 2rem;">Chưa có dự án được đề xuất.</p>';
            return;
        }

        container.innerHTML = projects.map(proj => `
            <a href="/${currentLang}/project/${proj.id}" class="project-card-horizontal">
                <img src="${proj.image || '/assets/images/project-image.svg'}" alt="${escapeHtml(proj.title)}" class="project-thumb-hz" />
                <div class="project-info-hz">
                    <div class="project-tags-row">
                        ${proj.tags.map(tag => `<span class="mini-tag">${escapeHtml(tag)}</span>`).join('')}
                        <span class="mini-tag match-tag">Match ${proj.match}%</span>
                    </div>
                    <h3 class="project-title-hz">${escapeHtml(proj.title)}</h3>
                    <p class="project-desc-hz">${escapeHtml(proj.desc || '')}</p>
                    <div class="project-meta-hz">
                        <span class="meta-item"><i class="fa-regular fa-user"></i> ${escapeHtml(proj.author)}</span>
                        <span class="meta-item"><i class="fa-regular fa-clock"></i> ${escapeHtml(proj.deadline || '')}</span>
                    </div>
                </div>
            </a>
        `).join('');
    }

    function renderTrendingSkills() {
        const container = document.getElementById('trending-skills');
        if (!container) return;

        const skills = dashboardData.trendingSkills || [];
        const loading = container.querySelector('.skills-loading');

        if (loading) loading.style.display = 'none';

        if (skills.length === 0) {
            container.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 1rem;">Chưa có kỹ năng trending.</p>';
            return;
        }

        container.innerHTML = skills.map(skill => `
            <div class="trend-tag">
                <i class="fa-solid fa-fire"></i> ${escapeHtml(skill.name)}
                <span class="trend-count">${skill.count}</span>
            </div>
        `).join('');
    }

    function renderProfileStrength() {
        const strength = dashboardData.profileStrength || 0;
        const chart = document.getElementById('profile-strength-chart');
        const info = document.getElementById('strength-info');

        if (chart) {
            chart.innerHTML = `
                <svg viewBox="0 0 36 36">
                    <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                    <path class="circle-progress" stroke-dasharray="${strength}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                </svg>
                <div class="percentage-text">${strength}%</div>
            `;
        }

        if (info) {
            let message = '';
            if (strength >= 80) {
                message = t('dashboard.profileImpressive');
            } else if (strength >= 50) {
                message = t('dashboard.profileGood');
            } else {
                message = t('dashboard.profileIncomplete');
            }

            info.innerHTML = `
                <p style="font-size: 0.9rem; color: #9ca3af; margin-bottom: 1rem;">${message}</p>
                <a href="/${currentLang}/edit-profile" class="btn-outline">${t('dashboard.completeProfile')}</a>
            `;
        }
    }

    function renderActivities() {
        const container = document.getElementById('activity-list');
        if (!container) return;

        const activities = dashboardData.activities || [];
        const loading = container.querySelector('.activities-loading');

        if (loading) loading.style.display = 'none';

        if (activities.length === 0) {
            container.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 1rem;">Chưa có hoạt động gần đây.</p>';
            return;
        }

        container.innerHTML = activities.map(act => {
            let icon = '';
            if (act.type === 'applied') icon = '<i class="fa-solid fa-paper-plane"></i>';
            else if (act.type === 'posted') icon = '<i class="fa-solid fa-plus"></i>';
            else if (act.type === 'joined') icon = '<i class="fa-solid fa-handshake"></i>';

            return `
                <div class="activity-item">
                    <div class="act-icon">${icon}</div>
                    <div class="act-text">
                        ${t(`dashboard.act_${act.type}`)} <span>${escapeHtml(act.project)}</span>
                        <span class="act-time">${escapeHtml(act.time || '')}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function showError(message) {
        const containers = [
            document.getElementById('recommended-projects'),
            document.getElementById('trending-skills'),
            document.getElementById('activity-list'),
        ];

        containers.forEach(container => {
            if (container) {
                container.innerHTML = `<p style="color: #ef4444; text-align: center; padding: 2rem;">${message}</p>`;
            }
        });
    }

    // Load data on page load
    loadDashboardData();
});

