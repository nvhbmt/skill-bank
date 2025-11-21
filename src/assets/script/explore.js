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
                    <div class="project-image" data-project-id="${project.id}">
                        <img
                            src="${
                                project.cover_image_url ||
                                '/assets/images/project-image.svg'
                            }"
                            alt="${project.title}"
                        />
                        <div class="project-content">
                            <div class="left-project-content">
                                <div class="design-web">
                                    ${project.title}
                                </div>
                                <div class="email-address">
                                    ${owner?.email || 'N/A'}
                                </div>
                            </div>
                            <div class="right-project-content">
                                <div class="interact">
                                    <div class="eyes">
                                        <img
                                            src="/assets/images/teenyicons_eye-outline.svg"
                                            alt=""
                                        />
                                        <span class="view-count">0</span>
                                    </div>
                                    <div class="like">
                                        <img
                                            src="/assets/images/solar_like-outline.svg"
                                            alt=""
                                        />
                                        <span class="like-count">0</span>
                                    </div>
                                </div>
                                <div class="view-more">
                                    Xem thêm
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            })
            .join('');

        // Add click handlers to project cards
        addClickHandlers();
    }

    // Function to add click handlers to project cards
    function addClickHandlers() {
        if (!projectsContainer) return;

        projectsContainer
            .querySelectorAll('.project-image')
            .forEach((card) => {
                card.style.cursor = 'pointer';
                const projectId = card.getAttribute('data-project-id');
                if (projectId) {
                    card.addEventListener('click', () => {
                        const currentLang =
                            window.location.pathname.split('/')[1] || 'vi';
                        window.location.href = `/${currentLang}/project/${projectId}`;
                    });
                }
            });
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
                window.location.href = window.location.pathname;
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

