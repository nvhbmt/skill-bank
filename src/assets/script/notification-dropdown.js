(function () {
    // Get configuration from data attributes
    const notificationDropdown = document.querySelector(
        '.notification-dropdown'
    );
    if (!notificationDropdown) return;

    const lang = notificationDropdown.dataset.lang || 'vi';
    const translations = JSON.parse(
        notificationDropdown.dataset.translations || '{}'
    );

    // Nội dung thông báo chứa dữ liệu người dùng nhập (tên dự án, tên người
    // ứng tuyển) và được ghép vào innerHTML, nên bắt buộc phải escape.
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    }

    // Dùng cho giá trị nằm trong thuộc tính HTML (data-*)
    function escapeAttr(value) {
        return escapeHtml(value).replace(/"/g, '&quot;');
    }

    // Function to update notification UI
    function updateNotificationUI(notifications) {
        const notificationList = document.getElementById('notification-list');
        const notificationBadge = document.querySelector('.notification-badge');
        const unreadCountEl = document.querySelector(
            '.notification-unread-count'
        );

        if (!notificationList) return;

        // Calculate unread count
        const unreadCount = notifications.filter((n) => !n.is_read).length;

        // Update badge
        if (unreadCount > 0) {
            if (notificationBadge) {
                notificationBadge.textContent = unreadCount.toString();
                notificationBadge.style.display = '';
            } else {
                // Create badge if it doesn't exist
                const button = document.getElementById('notification-button');
                if (button) {
                    const badge = document.createElement('span');
                    badge.className = 'notification-badge';
                    badge.textContent = unreadCount.toString();
                    button.appendChild(badge);
                }
            }
        } else {
            if (notificationBadge) {
                notificationBadge.style.display = 'none';
            }
        }

        // Update unread count text
        if (unreadCountEl) {
            unreadCountEl.textContent = `${unreadCount} ${
                lang === 'en' ? 'unread' : 'chưa đọc'
            }`;
            if (unreadCount === 0) {
                unreadCountEl.style.display = 'none';
            } else {
                unreadCountEl.style.display = '';
            }
        }

        // Update notification list
        if (notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="notification-empty">
                    <p>${lang === 'en' ? 'No notifications' : 'Chưa có thông báo'}</p>
                </div>
            `;
            return;
        }

        // Render notifications
        const parsedTranslations = translations;
        notificationList.innerHTML = notifications
            .map((notification) => {
                // Parse and render message
                let messageText = notification.message || '';
                let linkHtml = '';
                let projectId = null;

                try {
                    if (notification.type && notification.message) {
                        const data = JSON.parse(notification.message);
                        projectId = data.projectId;
                        const template = parsedTranslations[notification.type];

                        if (template) {
                            messageText = template.message || '';
                            // Replace template variables
                            messageText = messageText.replace(
                                /\{\{(\w+)\}\}/g,
                                (match, key) => {
                                    return data[key] != null
                                        ? escapeHtml(data[key])
                                        : match;
                                }
                            );

                            // Add link if projectId exists
                            const safeProjectId = Number.parseInt(
                                data.projectId,
                                10
                            );
                            if (Number.isFinite(safeProjectId)) {
                                projectId = safeProjectId;
                                const url =
                                    notification.type === 'application_received'
                                        ? `/${lang}/project/${safeProjectId}/candidate-manage`
                                        : notification.type ===
                                            'handover_submitted'
                                          ? `/${lang}/project-handover-manager/${safeProjectId}`
                                          : `/${lang}/project/${safeProjectId}`;
                                linkHtml = `<a href="${url}" class="notification-link">${escapeHtml(template.viewProject || 'Xem dự án')}</a>`;
                            } else {
                                projectId = null;
                            }
                        }
                    }
                } catch (e) {
                    // Use raw message if parsing fails
                    console.error('Error parsing notification:', e);
                }

                const title =
                    parsedTranslations[notification.type]?.title ||
                    notification.title ||
                    'Thông báo';

                const formattedDate = notification.created_at
                    ? new Date(notification.created_at).toLocaleString(
                          'vi-VN',
                          {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                          }
                      )
                    : '';

                const linkUrl = projectId
                    ? notification.type === 'application_received'
                        ? `/${lang}/project/${projectId}/candidate-manage`
                        : notification.type === 'handover_submitted'
                          ? `/${lang}/project-handover-manager/${projectId}`
                          : `/${lang}/project/${projectId}`
                    : '';

                return `
                    <button
                        class="notification-item ${!notification.is_read ? 'unread' : ''}"
                        data-notification-id="${escapeAttr(notification.id)}"
                        data-notification-title="${escapeAttr(title)}"
                        data-notification-message="${escapeAttr(notification.message || '')}"
                        data-notification-type="${escapeAttr(notification.type || '')}"
                        data-notification-link="${escapeAttr(linkUrl)}"
                    >
                        <div class="notification-item-content">
                            <h4 class="notification-item-title">${escapeHtml(title)}</h4>
                            <p class="notification-item-message">
                                ${messageText}${linkHtml}
                            </p>
                            <span class="notification-item-time">${formattedDate}</span>
                        </div>
                        ${!notification.is_read ? '<div class="notification-dot"></div>' : ''}
                    </button>
                `;
            })
            .join('');

        // Re-attach click handlers
        attachNotificationHandlers();
    }

    // Function to attach notification click handlers
    function attachNotificationHandlers() {
        const notificationItems =
            document.querySelectorAll('.notification-item');
        notificationItems.forEach((item) => {
            item.addEventListener('click', async function (e) {
                const target = e.target;
                // Don't trigger if clicking on link
                if (target.closest('.notification-link')) {
                    return;
                }

                const notificationId = this.dataset.notificationId;
                const title = this.dataset.notificationTitle;
                const message = this.dataset.notificationMessage;
                const type = this.dataset.notificationType;
                const link = this.dataset.notificationLink;

                if (!notificationId) return;

                // Mark as read
                try {
                    await fetch('/api/notifications/read', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            notification_id: parseInt(notificationId),
                        }),
                    });

                    // Update UI
                    this.classList.remove('unread');
                    const dot = this.querySelector('.notification-dot');
                    if (dot) dot.remove();

                    // Update badge count
                    const badge = document.querySelector('.notification-badge');
                    if (badge) {
                        const unreadItems = document.querySelectorAll(
                            '.notification-item.unread'
                        );
                        const unreadCount = unreadItems.length;
                        if (unreadCount > 0) {
                            badge.textContent = unreadCount.toString();
                        } else {
                            badge.style.display = 'none';
                        }
                    }
                } catch (error) {
                    console.error('Error marking notification as read:', error);
                }

                // Open notification dialog
                if (window.openNotificationDialog) {
                    window.openNotificationDialog(
                        title || 'Thông báo',
                        message || '',
                        type || '',
                        new Date().toISOString()
                    );
                }
            });
        });
    }

    // Function to fetch notifications from API
    async function fetchNotifications() {
        const notificationList = document.getElementById('notification-list');
        if (!notificationList) return;

        // Show loading state
        notificationList.innerHTML = `
            <div class="notification-loading">
                <p>${lang === 'en' ? 'Loading...' : 'Đang tải...'}</p>
            </div>
        `;

        try {
            const response = await fetch('/api/notifications');
            const result = await response.json();

            if (result.success && result.data) {
                const notifications = result.data.notifications || [];
                updateNotificationUI(notifications);
            } else {
                // Show error or empty state
                notificationList.innerHTML = `
                    <div class="notification-empty">
                        <p>${lang === 'en' ? 'No notifications' : 'Chưa có thông báo'}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            notificationList.innerHTML = `
                <div class="notification-empty">
                    <p>${lang === 'en' ? 'Error loading notifications' : 'Lỗi khi tải thông báo'}</p>
                </div>
            `;
        }
    }

    // Initialize when DOM is ready
    const initialize = () => {
        attachNotificationHandlers();
        // Fetch notifications when page loads
        fetchNotifications();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
