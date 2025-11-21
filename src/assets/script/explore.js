document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const projectsContainer = document.getElementById('projects-container');
    let searchTimeout;

    // Add click handlers to initial projects
    addClickHandlers();

    // Debounced search function
    function performSearch(query) {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(
                    `/api/projects/search?q=${encodeURIComponent(query)}`
                );
                const result = await response.json();

                if (result.success && result.data) {
                    displayProjects(result.data.projects);
                } else {
                    console.error('Search error:', result.message);
                }
            } catch (error) {
                console.error('Error searching projects:', error);
            }
        }, 300); // 300ms debounce
    }

    // Display projects
    function displayProjects(projects) {
        if (!projectsContainer) return;

        if (projects.length === 0) {
            projectsContainer.innerHTML = `
                <div class="no-projects">
                    <p>Không tìm thấy dự án nào</p>
                </div>
            `;
            return;
        }

        // Render projects using ProjectCard format
        const currentLang = window.location.pathname.split('/')[1] || 'vi';

        projectsContainer.innerHTML = projects
            .map((project) => {
                const owner = project.user_info;
                const projectTypeLabel =
                    project.project_type === 'website'
                        ? 'Website'
                        : project.project_type === 'mobile-app'
                          ? 'Mobile App'
                          : project.project_type === 'desktop-app'
                            ? 'Desktop App'
                            : project.project_type || '';

                return `
                    <a href="/${currentLang}/project/${project.id}" class="project-card-new">
                        <div class="project-thumb-wrapper">
                            <img
                                src="${project.cover_image_url || '/assets/images/project-image.svg'}"
                                alt="${project.title}"
                                class="project-thumb-new"
                            />
                        </div>
                        <div class="project-info-new">
                            <div class="project-header-row">
                                <span class="project-title-new">${project.title || ''}</span>
                                <span class="project-tag-badge">${projectTypeLabel}</span>
                            </div>
                            <p class="project-desc">${project.description || ''}</p>
                            <div class="project-stats-row">
                                <span class="author-info">by ${owner?.full_name || owner?.username || 'N/A'}</span>
                                <div class="stats-icons">
                                    <div class="stat-icon">
                                        <i class="fa-regular fa-thumbs-up"></i>
                                        <span>0</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </a>
                `;
            })
            .join('');

        // Add click handlers to project cards
        addClickHandlers();
    }

    // Function to add click handlers to project cards
    function addClickHandlers() {
        if (!projectsContainer) return;

        // ProjectCard components are already links, so no need for additional handlers
        // This function is kept for compatibility but doesn't need to do anything
        // since ProjectCard uses <a> tags
    }

    // Handle search input
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length > 0) {
                performSearch(query);
            } else {
                // Reset to initial projects if search is cleared
                // Reload page to show initial projects
                window.location.reload();
            }
        });

        // Handle Enter key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = searchInput.value.trim();
                if (query.length > 0) {
                    performSearch(query);
                }
            }
        });
    }
});
