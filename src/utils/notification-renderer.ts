/**
 * Render notification message from JSON data and template
 */
export function renderNotificationMessage(
    type: string | null,
    messageJson: string | null,
    translations: {
        application_received: { message: string; viewProject: string };
        project_approved: { message: string; viewProject: string };
        application_approved: { message: string; viewProject: string };
        project_rejected: { message: string; viewProject: string };
        application_rejected: { message: string; viewProject: string };
    },
    lang: 'vi' | 'en' = 'vi'
): { text: string; link?: { url: string; text: string } } {
    if (!type || !messageJson) {
        return { text: messageJson || '' };
    }

    try {
        const data = JSON.parse(messageJson);
        const template = translations[type as keyof typeof translations];

        if (!template) {
            return { text: messageJson };
        }

        // Replace template variables
        let message = template.message;
        message = message.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] || match;
        });

        // Extract project link if projectId exists
        let link: { url: string; text: string } | undefined;
        if (data.projectId) {
            link = {
                url: `/project/${data.projectId}`,
                text: template.viewProject,
            };
        }

        return { text: message, link };
    } catch (error) {
        console.error('Error parsing notification message:', error);
        return { text: messageJson };
    }
}

/**
 * Get notification title from type
 */
export function getNotificationTitle(
    type: string | null,
    translations: {
        application_received: { title: string };
        project_approved: { title: string };
        application_approved: { title: string };
        project_rejected: { title: string };
        application_rejected: { title: string };
    },
    fallbackTitle?: string
): string {
    if (!type) {
        return fallbackTitle || 'Thông báo';
    }

    const template = translations[type as keyof typeof translations];
    return template?.title || fallbackTitle || 'Thông báo';
}

