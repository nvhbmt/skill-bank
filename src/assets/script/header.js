(function () {
    // @ts-ignore
    const lang = window.lang || 'vi';

    // Prevent multiple initializations
    if (window.headerInitialized) {
        return;
    }
    window.headerInitialized = true;

    function initHeader() {
        const avatarButton = document.getElementById('avatar-button');
        const dropdownMenu = document.getElementById(
            'avatar-dropdown-menu'
        );
        const logoutButton = document.getElementById('logout-button');
        const languageSelect = document.getElementById('choose-language');
        const notificationButton = document.getElementById('notification-button');
        const notificationDropdown = document.getElementById('notification-dropdown-menu');

        // Toggle dropdown menu
        if (avatarButton && dropdownMenu) {
            // Remove existing listeners to prevent duplicates
            const newAvatarButton = avatarButton.cloneNode(true);
            avatarButton.parentNode?.replaceChild(
                newAvatarButton,
                avatarButton
            );
            const newButton = document.getElementById('avatar-button');

            if (newButton) {
                newButton.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const menu = document.getElementById(
                        'avatar-dropdown-menu'
                    );
                    if (menu) {
                        const isActive = menu.classList.contains('active');
                        if (isActive) {
                            menu.classList.remove('active');
                        } else {
                            menu.classList.add('active');
                        }
                    }
                });
            }

            // Close dropdown when clicking outside
            const clickOutsideHandler = function (e) {
                const target = e.target;
                if (!target) return;
                const button = document.getElementById('avatar-button');
                const menu = document.getElementById(
                    'avatar-dropdown-menu'
                );
                if (button && menu) {
                    const isClickInside =
                        button.contains(target) || menu.contains(target);

                    if (
                        !isClickInside &&
                        menu.classList.contains('active')
                    ) {
                        menu.classList.remove('active');
                    }
                }
            };

            // Remove old listener if exists
            document.removeEventListener('click', clickOutsideHandler);
            document.addEventListener('click', clickOutsideHandler);

            // Close dropdown when clicking on menu items (except logout)
            const menuItems = dropdownMenu.querySelectorAll(
                '.dropdown-item'
            );
            menuItems.forEach(function (item) {
                if (item.id !== 'logout-button') {
                    item.addEventListener('click', function () {
                        dropdownMenu.classList.remove('active');
                    });
                }
            });
        }

        // Logout functionality
        if (logoutButton) {
            const logoutHandler = async function (e) {
                e.preventDefault();
                e.stopPropagation();
                const response = await fetch('/api/auth/sign-out', {
                    method: 'POST',
                });
                if (response.ok) {
                    window.location.href = '/' + lang + '/';
                }
            };
            logoutButton.removeEventListener('click', logoutHandler);
            logoutButton.addEventListener('click', logoutHandler);
        }

        // Language selector
        if (languageSelect) {
            const languageHandler = function (e) {
                const target = e.target;
                if (!target) return;
                const selectedLang = target.value;
                const currentPath = window.location.pathname;
                const pathParts = currentPath.split('/').filter(Boolean);

                // Replace language in URL
                if (pathParts[0] === 'vi' || pathParts[0] === 'en') {
                    pathParts[0] = selectedLang;
                } else {
                    pathParts.unshift(selectedLang);
                }

                window.location.href = '/' + pathParts.join('/');
            };
            languageSelect.removeEventListener('change', languageHandler);
            languageSelect.addEventListener('change', languageHandler);
        }

        // Notification dropdown functionality
        if (notificationButton && notificationDropdown) {
            // Remove existing listeners to prevent duplicates
            const newNotificationButton = notificationButton.cloneNode(true);
            notificationButton.parentNode?.replaceChild(
                newNotificationButton,
                notificationButton
            );
            const newNotifButton = document.getElementById('notification-button');

            // Notification item click handler
            const handleNotificationItemClick = async function (e) {
                const item = e.target.closest('.notification-item');
                if (!item) {
                    console.log('Click not on notification item');
                    return;
                }

                console.log('Notification item clicked:', item);
                e.preventDefault();
                e.stopPropagation();

                const notificationId = item.getAttribute('data-notification-id');
                const title = item.getAttribute('data-notification-title') || '';
                const message = item.getAttribute('data-notification-message') || '';
                const type = item.getAttribute('data-notification-type') || '';
                const createdAt = item.querySelector('.notification-item-time')?.textContent || '';

                // Close dropdown first
                const menu = document.getElementById('notification-dropdown-menu');
                if (menu) {
                    menu.classList.remove('active');
                }

                // Mark as read
                if (notificationId) {
                    try {
                        await fetch('/api/notifications/read', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ notification_id: notificationId }),
                        });
                        // Update UI
                        item.classList.remove('unread');
                        const dot = item.querySelector('.notification-dot');
                        if (dot) {
                            dot.remove();
                        }
                        // Update badge count
                        const badge = document.querySelector('.notification-badge');
                        if (badge) {
                            const currentCount = parseInt(badge.textContent || '0');
                            if (currentCount > 1) {
                                badge.textContent = (currentCount - 1).toString();
                            } else {
                                badge.remove();
                            }
                        }
                    } catch (error) {
                        console.error('Error marking notification as read:', error);
                    }
                }

                // Open dialog immediately
                console.log('About to call openNotificationDialog');
                openNotificationDialog(title, message, type, createdAt);
                console.log('openNotificationDialog called');
            };

            if (newNotifButton) {
                newNotifButton.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const menu = document.getElementById('notification-dropdown-menu');
                    if (menu) {
                        const isActive = menu.classList.contains('active');
                        if (isActive) {
                            menu.classList.remove('active');
                        } else {
                            menu.classList.add('active');
                            // Close avatar dropdown if open
                            if (dropdownMenu) {
                                dropdownMenu.classList.remove('active');
                            }

                            // Setup notification item handlers when dropdown opens
                            const notificationList = menu.querySelector('.notification-list');
                            if (notificationList) {
                                // Remove existing listener to prevent duplicates
                                notificationList.removeEventListener('click', handleNotificationItemClick);
                                // Add listener
                                notificationList.addEventListener('click', handleNotificationItemClick);

                                // Also attach directly to each item as backup
                                const items = notificationList.querySelectorAll('.notification-item');
                                items.forEach(function(item) {
                                    item.removeEventListener('click', handleNotificationItemClick);
                                    item.addEventListener('click', handleNotificationItemClick);
                                });
                            }
                        }
                    }
                });
            }

            // Also setup handlers initially
            const notificationList = notificationDropdown.querySelector('.notification-list');
            if (notificationList) {
                notificationList.addEventListener('click', handleNotificationItemClick);
            }

            // Close notification dropdown when clicking outside
            const notificationClickOutsideHandler = function (e) {
                const target = e.target;
                if (!target) return;
                const button = document.getElementById('notification-button');
                const menu = document.getElementById('notification-dropdown-menu');
                if (button && menu) {
                    // Don't close if clicking on notification item
                    const isNotificationItem = target.closest('.notification-item');
                    if (isNotificationItem) return;

                    const isClickInside =
                        button.contains(target) || menu.contains(target);

                    if (
                        !isClickInside &&
                        menu.classList.contains('active')
                    ) {
                        menu.classList.remove('active');
                    }
                }
            };

            document.removeEventListener('click', notificationClickOutsideHandler);
            document.addEventListener('click', notificationClickOutsideHandler);
        }
    }

    // Notification Dialog Functions - using Dialog component
    function openNotificationDialog(title, message, type, createdAt) {
        console.log('openNotificationDialog called:', { title, message, type, createdAt });
        // Use the function exported by Dialog component
        // For id="notification-dialog", the function name will be "openNotificationDialog"
        if (window.openNotificationDialog) {
            window.openNotificationDialog(title, message, type, createdAt);
        } else {
            // Fallback: wait a bit for Dialog component to initialize
            setTimeout(() => {
                if (window.openNotificationDialog) {
                    window.openNotificationDialog(title, message, type, createdAt);
                } else {
                    console.error('Dialog function not found. Make sure Dialog component is loaded.');
                }
            }, 100);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeader);
    } else {
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(initHeader, 0);
    }

    // Fallback initialization after a delay
    setTimeout(function () {
        const avatarButton = document.getElementById('avatar-button');
        const dropdownMenu = document.getElementById(
            'avatar-dropdown-menu'
        );
        const notificationButton = document.getElementById('notification-button');
        const notificationDropdown = document.getElementById('notification-dropdown-menu');
        if ((avatarButton && dropdownMenu) || (notificationButton && notificationDropdown)) {
            initHeader();
        }
    }, 200);
})();

