/**
 * Render notification message from JSON data and template
 */
export function renderNotificationMessage(
    type: string | null,
    messageJson: string | null,
    translations: Record<
        string,
        { title?: string; message: string; viewProject: string }
    >,
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
            // For application_received, link to candidate management page
            // Route thật luôn có tiền tố ngôn ngữ, thiếu nó là link 404
            let path = `/project/${data.projectId}`;
            if (type === 'application_received') {
                path = `/project/${data.projectId}/candidate-manage`;
            } else if (type === 'handover_submitted') {
                path = `/project-handover-manager/${data.projectId}`;
            }
            const url = `/${lang}${path}`;
            link = {
                url,
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
    translations: Record<string, { title?: string }>,
    fallbackTitle?: string
): string {
    if (!type) {
        return fallbackTitle || 'Thông báo';
    }

    const template = translations[type as keyof typeof translations];
    return template?.title || fallbackTitle || 'Thông báo';
}
