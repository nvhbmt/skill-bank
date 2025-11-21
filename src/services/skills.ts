import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database.types';

/**
 * Get all skills from database
 */
export async function getAllSkills(): Promise<
    Array<Pick<Tables<'skills'>, 'id' | 'name'>>
> {
    try {
        const { data, error } = await supabase
            .from('skills')
            .select('id, name')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error loading skills:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error loading skills:', error);
        return [];
    }
}

