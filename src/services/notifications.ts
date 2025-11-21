import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export type NotificationType =
    | 'application_received' // Có người muốn tham gia dự án
    | 'project_approved' // Dự án đã được duyệt
    | 'application_approved' // Đã được duyệt vào dự án
    | 'project_rejected' // Dự án đã bị từ chối
    | 'application_rejected'; // Đã bị từ chối khi tham gia dự án

interface CreateNotificationParams {
    userId: string;
    type: NotificationType;
    title: string | null;
    message: string;
    supabaseClient?: SupabaseClient;
}

/**
 * Create a notification
 */
export async function createNotification(
    params: CreateNotificationParams
): Promise<boolean> {
    const client = params.supabaseClient || supabase;

    const { error } = await client.from('notifications').insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        is_read: false,
        created_at: new Date().toISOString(),
    });

    if (error) {
        console.error('Error creating notification:', error);
        return false;
    }

    return true;
}

/**
 * Create notification for application received
 */
export async function notifyApplicationReceived(
    projectOwnerId: string,
    applicantName: string,
    applicantUsername: string,
    projectId: number,
    projectTitle: string,
    lang: 'vi' | 'en' = 'vi',
    supabaseClient?: SupabaseClient
): Promise<boolean> {
    // Store data as JSON for template rendering
    const messageData = {
        applicantName,
        applicantUsername,
        projectId,
        projectTitle,
    };

    return createNotification({
        userId: projectOwnerId,
        type: 'application_received',
        title: null, // Title will be rendered from template
        message: JSON.stringify(messageData),
        supabaseClient,
    });
}

/**
 * Create notification for project approved
 */
export async function notifyProjectApproved(
    projectOwnerId: string,
    projectId: number,
    projectTitle: string,
    lang: 'vi' | 'en' = 'vi',
    supabaseClient?: SupabaseClient
): Promise<boolean> {
    // Store data as JSON for template rendering
    const messageData = {
        projectId,
        projectTitle,
    };

    return createNotification({
        userId: projectOwnerId,
        type: 'project_approved',
        title: null, // Title will be rendered from template
        message: JSON.stringify(messageData),
        supabaseClient,
    });
}

/**
 * Create notification for application approved
 */
export async function notifyApplicationApproved(
    applicantId: string,
    projectId: number,
    projectTitle: string,
    lang: 'vi' | 'en' = 'vi',
    supabaseClient?: SupabaseClient
): Promise<boolean> {
    // Store data as JSON for template rendering
    const messageData = {
        projectId,
        projectTitle,
    };

    return createNotification({
        userId: applicantId,
        type: 'application_approved',
        title: null, // Title will be rendered from template
        message: JSON.stringify(messageData),
        supabaseClient,
    });
}

/**
 * Create notification for project rejected
 */
export async function notifyProjectRejected(
    projectOwnerId: string,
    projectId: number,
    projectTitle: string,
    lang: 'vi' | 'en' = 'vi',
    supabaseClient?: SupabaseClient
): Promise<boolean> {
    // Store data as JSON for template rendering
    const messageData = {
        projectId,
        projectTitle,
    };

    return createNotification({
        userId: projectOwnerId,
        type: 'project_rejected',
        title: null, // Title will be rendered from template
        message: JSON.stringify(messageData),
        supabaseClient,
    });
}

/**
 * Create notification for application rejected
 */
export async function notifyApplicationRejected(
    applicantId: string,
    projectId: number,
    projectTitle: string,
    lang: 'vi' | 'en' = 'vi',
    supabaseClient?: SupabaseClient
): Promise<boolean> {
    // Store data as JSON for template rendering
    const messageData = {
        projectId,
        projectTitle,
    };

    return createNotification({
        userId: applicantId,
        type: 'application_rejected',
        title: null, // Title will be rendered from template
        message: JSON.stringify(messageData),
        supabaseClient,
    });
}
