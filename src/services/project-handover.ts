import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database.types';

export type ApplicationWithApplicant = Pick<
    Tables<'applications'>,
    'id' | 'status' | 'applied_at' | 'cover_letter'
> & {
    applicant: Pick<
        Tables<'user_info'>,
        'user_id' | 'username' | 'full_name' | 'email' | 'avatar_url'
    > | null;
};

export type ProjectMember = Pick<
    Tables<'user_info'>,
    'user_id' | 'username' | 'full_name' | 'email' | 'avatar_url'
> & {
    role: string | null;
    handover_note: string | null;
};

/**
 * Get applications for a project
 */
export async function getProjectApplications(projectId: number): Promise<{
    pending: ApplicationWithApplicant[];
    approved: ApplicationWithApplicant[];
}> {
    const { data: applications, error } = await supabase
        .from('applications')
        .select('id, status, applied_at, cover_letter, applicant_id')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('applied_at', { ascending: false });

    if (error) {
        console.error('Error fetching applications:', error);
        return { pending: [], approved: [] };
    }

    if (!applications || applications.length === 0) {
        return { pending: [], approved: [] };
    }

    // Fetch applicant info
    const applicantIds = [
        ...new Set(applications.map((app) => app.applicant_id)),
    ];
    const { data: applicantsData } = await supabase
        .from('user_info')
        .select('user_id, username, full_name, email, avatar_url')
        .in('user_id', applicantIds)
        .is('deleted_at', null);

    const applicantsMap = new Map(
        (applicantsData || []).map((app) => [app.user_id, app])
    );

    const applicationsWithApplicants = applications.map((app) => ({
        id: app.id,
        status: app.status,
        applied_at: app.applied_at,
        cover_letter: app.cover_letter,
        applicant: applicantsMap.get(app.applicant_id) || null,
    }));

    const pending = applicationsWithApplicants.filter(
        (app) => app.status === 'pending' || !app.status
    );
    const approved = applicationsWithApplicants.filter(
        (app) => app.status === 'approved'
    );

    return { pending, approved };
}

/**
 * Get project members with handover notes
 */
export async function getProjectMembers(
    projectId: number
): Promise<ProjectMember[]> {
    const { data: membersData, error } = await supabase
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .is('left_at', null);

    if (error) {
        console.error('Error fetching members:', error);
        return [];
    }

    if (!membersData || membersData.length === 0) {
        return [];
    }

    // Fetch member info
    const memberIds = membersData.map((m) => m.user_id);
    const { data: membersInfo } = await supabase
        .from('user_info')
        .select('user_id, username, full_name, email, avatar_url')
        .in('user_id', memberIds)
        .is('deleted_at', null);

    const membersMap = new Map((membersInfo || []).map((m) => [m.user_id, m]));

    // Fetch handover notes from deliveries (if exists)
    // For now, we'll return empty handover_note
    // You can extend this to fetch from deliveries table if needed

    return (membersData as ProjectMember[])
        .map((m) => {
            const info = membersMap.get(m.user_id);
            return info
                ? {
                      ...info,
                      role: m.role,
                      handover_note: null, // Can be extended to fetch from deliveries
                  }
                : null;
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);
}

/**
 * Approve an application
 */
export async function approveApplication(
    applicationId: number,
    projectId: number
): Promise<boolean> {
    const { error: appError } = await supabase
        .from('applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);

    if (appError) {
        console.error('Error approving application:', appError);
        return false;
    }

    // Add applicant as project member
    const { data: application } = await supabase
        .from('applications')
        .select('applicant_id')
        .eq('id', applicationId)
        .single();

    if (application) {
        const { error: memberError } = await supabase
            .from('project_members')
            .insert({
                project_id: projectId,
                user_id: application.applicant_id,
                role: 'collaborator',
                joined_at: new Date().toISOString(),
            });

        if (memberError) {
            console.error('Error adding member:', memberError);
            // Don't fail if member already exists
        }
    }

    return true;
}

/**
 * Reject an application
 */
export async function rejectApplication(
    applicationId: number
): Promise<boolean> {
    const { error } = await supabase
        .from('applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId);

    if (error) {
        console.error('Error rejecting application:', error);
        return false;
    }

    return true;
}
