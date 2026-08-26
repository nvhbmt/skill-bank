import { createServiceRoleClient } from '@/lib/supabase';

export type NotificationType =
    | 'application_received' // Có người muốn tham gia dự án
    | 'project_approved' // Dự án đã được duyệt
    | 'application_approved' // Đã được duyệt vào dự án
    | 'project_rejected' // Dự án đã bị từ chối
    | 'application_rejected' // Đã bị từ chối khi tham gia dự án
    | 'handover_submitted' // Thành viên đã gửi bàn giao
    | 'handover_approved' // Bàn giao được nghiệm thu
    | 'handover_rejected' // Bàn giao bị trả lại
    | 'project_completed' // Dự án đã kết thúc, có thể đánh giá
    | 'review_received'; // Nhận được đánh giá mới

interface CreateNotificationParams {
    userId: string;
    type: NotificationType;
    title: string | null;
    message: string;
}

/**
 * Create a notification with system privileges (bypasses RLS)
 * This function uses service role key to ensure notifications can be created
 * regardless of RLS policies
 */
export async function createNotification(
    params: CreateNotificationParams
): Promise<boolean> {
    // Use service role client to bypass RLS
    const supabase = createServiceRoleClient();

    const { error } = await supabase.from('notifications').insert({
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
    projectTitle: string
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
    });
}

/**
 * Create notification for project approved
 */
export async function notifyProjectApproved(
    projectOwnerId: string,
    projectId: number,
    projectTitle: string
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
    });
}

/**
 * Create notification for application approved
 */
export async function notifyApplicationApproved(
    applicantId: string,
    projectId: number,
    projectTitle: string
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
    });
}

/**
 * Create notification for project rejected
 */
export async function notifyProjectRejected(
    projectOwnerId: string,
    projectId: number,
    projectTitle: string
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
    });
}

/**
 * Create notification for application rejected
 */
export async function notifyApplicationRejected(
    applicantId: string,
    projectId: number,
    projectTitle: string
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
    });
}

/**
 * Thông báo cho chủ dự án khi thành viên gửi bàn giao
 */
export async function notifyHandoverSubmitted(
    projectOwnerId: string,
    memberName: string,
    projectId: number,
    projectTitle: string
): Promise<boolean> {
    return createNotification({
        userId: projectOwnerId,
        type: 'handover_submitted',
        title: null,
        message: JSON.stringify({ memberName, projectId, projectTitle }),
    });
}

/**
 * Thông báo cho thành viên khi chủ dự án nghiệm thu bàn giao
 */
export async function notifyHandoverApproved(
    memberId: string,
    projectId: number,
    projectTitle: string
): Promise<boolean> {
    return createNotification({
        userId: memberId,
        type: 'handover_approved',
        title: null,
        message: JSON.stringify({ projectId, projectTitle }),
    });
}

/**
 * Thông báo cho thành viên khi bàn giao bị trả lại
 */
export async function notifyHandoverRejected(
    memberId: string,
    projectId: number,
    projectTitle: string
): Promise<boolean> {
    return createNotification({
        userId: memberId,
        type: 'handover_rejected',
        title: null,
        message: JSON.stringify({ projectId, projectTitle }),
    });
}

/**
 * Báo cho thành viên khi dự án kết thúc để họ vào đánh giá
 */
export async function notifyProjectCompleted(
    memberId: string,
    projectId: number,
    projectTitle: string
): Promise<boolean> {
    return createNotification({
        userId: memberId,
        type: 'project_completed',
        title: null,
        message: JSON.stringify({ projectId, projectTitle }),
    });
}

/**
 * Báo cho người được đánh giá
 */
export async function notifyReviewReceived(
    revieweeId: string,
    reviewerName: string,
    projectId: number,
    projectTitle: string
): Promise<boolean> {
    return createNotification({
        userId: revieweeId,
        type: 'review_received',
        title: null,
        message: JSON.stringify({ reviewerName, projectId, projectTitle }),
    });
}
