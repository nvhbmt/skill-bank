export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: '13.0.5';
    };
    graphql_public: {
        Tables: {
            [_ in never]: never;
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            graphql: {
                Args: {
                    extensions?: Json;
                    operationName?: string;
                    query?: string;
                    variables?: Json;
                };
                Returns: Json;
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
    public: {
        Tables: {
            applications: {
                Row: {
                    applicant_id: string;
                    applied_at: string | null;
                    cover_letter: string | null;
                    deleted_at: string | null;
                    id: number;
                    project_id: number;
                    status: string | null;
                };
                Insert: {
                    applicant_id: string;
                    applied_at?: string | null;
                    cover_letter?: string | null;
                    deleted_at?: string | null;
                    id?: number;
                    project_id: number;
                    status?: string | null;
                };
                Update: {
                    applicant_id?: string;
                    applied_at?: string | null;
                    cover_letter?: string | null;
                    deleted_at?: string | null;
                    id?: number;
                    project_id?: number;
                    status?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'applications_project_id_fkey';
                        columns: ['project_id'];
                        isOneToOne: false;
                        referencedRelation: 'projects';
                        referencedColumns: ['id'];
                    },
                ];
            };
            contracts: {
                Row: {
                    created_at: string | null;
                    deleted_at: string | null;
                    end_date: string | null;
                    id: number;
                    member_id: string;
                    project_id: number;
                    start_date: string | null;
                    status: string | null;
                    terms: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    deleted_at?: string | null;
                    end_date?: string | null;
                    id?: number;
                    member_id: string;
                    project_id: number;
                    start_date?: string | null;
                    status?: string | null;
                    terms?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    deleted_at?: string | null;
                    end_date?: string | null;
                    id?: number;
                    member_id?: string;
                    project_id?: number;
                    start_date?: string | null;
                    status?: string | null;
                    terms?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'contracts_project_id_fkey';
                        columns: ['project_id'];
                        isOneToOne: false;
                        referencedRelation: 'projects';
                        referencedColumns: ['id'];
                    },
                ];
            };
            deliveries: {
                Row: {
                    contract_id: number;
                    deleted_at: string | null;
                    delivery_date: string | null;
                    description: string | null;
                    id: number;
                    status: string | null;
                };
                Insert: {
                    contract_id: number;
                    deleted_at?: string | null;
                    delivery_date?: string | null;
                    description?: string | null;
                    id?: number;
                    status?: string | null;
                };
                Update: {
                    contract_id?: number;
                    deleted_at?: string | null;
                    delivery_date?: string | null;
                    description?: string | null;
                    id?: number;
                    status?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'deliveries_contract_id_fkey';
                        columns: ['contract_id'];
                        isOneToOne: false;
                        referencedRelation: 'contracts';
                        referencedColumns: ['id'];
                    },
                ];
            };
            disputes: {
                Row: {
                    created_at: string | null;
                    deleted_at: string | null;
                    description: string | null;
                    id: number;
                    project_id: number;
                    raised_by_id: string;
                    resolved_by: string | null;
                    status: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    deleted_at?: string | null;
                    description?: string | null;
                    id?: number;
                    project_id: number;
                    raised_by_id: string;
                    resolved_by?: string | null;
                    status?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    deleted_at?: string | null;
                    description?: string | null;
                    id?: number;
                    project_id?: number;
                    raised_by_id?: string;
                    resolved_by?: string | null;
                    status?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'disputes_project_id_fkey';
                        columns: ['project_id'];
                        isOneToOne: false;
                        referencedRelation: 'projects';
                        referencedColumns: ['id'];
                    },
                ];
            };
            messages: {
                Row: {
                    content: string;
                    deleted_at: string | null;
                    id: number;
                    is_read: boolean | null;
                    receiver_id: string;
                    sender_id: string | null;
                    sent_at: string | null;
                };
                Insert: {
                    content: string;
                    deleted_at?: string | null;
                    id?: number;
                    is_read?: boolean | null;
                    receiver_id: string;
                    sender_id?: string | null;
                    sent_at?: string | null;
                };
                Update: {
                    content?: string;
                    deleted_at?: string | null;
                    id?: number;
                    is_read?: boolean | null;
                    receiver_id?: string;
                    sender_id?: string | null;
                    sent_at?: string | null;
                };
                Relationships: [];
            };
            notifications: {
                Row: {
                    created_at: string | null;
                    id: number;
                    is_read: boolean | null;
                    message: string | null;
                    title: string | null;
                    type: string | null;
                    user_id: string;
                };
                Insert: {
                    created_at?: string | null;
                    id?: number;
                    is_read?: boolean | null;
                    message?: string | null;
                    title?: string | null;
                    type?: string | null;
                    user_id: string;
                };
                Update: {
                    created_at?: string | null;
                    id?: number;
                    is_read?: boolean | null;
                    message?: string | null;
                    title?: string | null;
                    type?: string | null;
                    user_id?: string;
                };
                Relationships: [];
            };
            password_resets: {
                Row: {
                    deleted_at: string | null;
                    expires_at: string;
                    id: number;
                    token: string;
                    used: boolean | null;
                    user_id: string;
                };
                Insert: {
                    deleted_at?: string | null;
                    expires_at: string;
                    id?: number;
                    token: string;
                    used?: boolean | null;
                    user_id: string;
                };
                Update: {
                    deleted_at?: string | null;
                    expires_at?: string;
                    id?: number;
                    token?: string;
                    used?: boolean | null;
                    user_id?: string;
                };
                Relationships: [];
            };
            project_members: {
                Row: {
                    deleted_at: string | null;
                    id: number;
                    joined_at: string | null;
                    left_at: string | null;
                    project_id: number;
                    role: string | null;
                    user_id: string;
                };
                Insert: {
                    deleted_at?: string | null;
                    id?: number;
                    joined_at?: string | null;
                    left_at?: string | null;
                    project_id: number;
                    role?: string | null;
                    user_id: string;
                };
                Update: {
                    deleted_at?: string | null;
                    id?: number;
                    joined_at?: string | null;
                    left_at?: string | null;
                    project_id?: number;
                    role?: string | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'project_members_project_id_fkey';
                        columns: ['project_id'];
                        isOneToOne: false;
                        referencedRelation: 'projects';
                        referencedColumns: ['id'];
                    },
                ];
            };
            project_skills: {
                Row: {
                    id: number;
                    project_id: number;
                    skill_id: number;
                };
                Insert: {
                    id?: number;
                    project_id: number;
                    skill_id: number;
                };
                Update: {
                    id?: number;
                    project_id?: number;
                    skill_id?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: 'project_skills_project_id_fkey';
                        columns: ['project_id'];
                        isOneToOne: false;
                        referencedRelation: 'projects';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'project_skills_skill_id_fkey';
                        columns: ['skill_id'];
                        isOneToOne: false;
                        referencedRelation: 'skills';
                        referencedColumns: ['id'];
                    },
                ];
            };
            projects: {
                Row: {
                    created_at: string | null;
                    deleted_at: string | null;
                    description: string | null;
                    id: number;
                    owner_id: string;
                    status: string | null;
                    title: string;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    deleted_at?: string | null;
                    description?: string | null;
                    id?: number;
                    owner_id: string;
                    status?: string | null;
                    title: string;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    deleted_at?: string | null;
                    description?: string | null;
                    id?: number;
                    owner_id?: string;
                    status?: string | null;
                    title?: string;
                    updated_at?: string | null;
                };
                Relationships: [];
            };
            reviews: {
                Row: {
                    comment: string | null;
                    created_at: string | null;
                    deleted_at: string | null;
                    id: number;
                    project_id: number;
                    rating: number | null;
                    reviewee_id: string;
                    reviewer_id: string;
                };
                Insert: {
                    comment?: string | null;
                    created_at?: string | null;
                    deleted_at?: string | null;
                    id?: number;
                    project_id: number;
                    rating?: number | null;
                    reviewee_id: string;
                    reviewer_id: string;
                };
                Update: {
                    comment?: string | null;
                    created_at?: string | null;
                    deleted_at?: string | null;
                    id?: number;
                    project_id?: number;
                    rating?: number | null;
                    reviewee_id?: string;
                    reviewer_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'reviews_project_id_fkey';
                        columns: ['project_id'];
                        isOneToOne: false;
                        referencedRelation: 'projects';
                        referencedColumns: ['id'];
                    },
                ];
            };
            skills: {
                Row: {
                    category: string | null;
                    created_at: string | null;
                    description: string | null;
                    id: number;
                    name: string;
                };
                Insert: {
                    category?: string | null;
                    created_at?: string | null;
                    description?: string | null;
                    id?: number;
                    name: string;
                };
                Update: {
                    category?: string | null;
                    created_at?: string | null;
                    description?: string | null;
                    id?: number;
                    name?: string;
                };
                Relationships: [];
            };
            user_info: {
                Row: {
                    avatar_url: string | null;
                    created_at: string | null;
                    deleted_at: string | null;
                    email: string;
                    full_name: string | null;
                    role: string;
                    updated_at: string | null;
                    user_id: string;
                    username: string;
                };
                Insert: {
                    avatar_url?: string | null;
                    created_at?: string | null;
                    deleted_at?: string | null;
                    email: string;
                    full_name?: string | null;
                    role: string;
                    updated_at?: string | null;
                    user_id: string;
                    username: string;
                };
                Update: {
                    avatar_url?: string | null;
                    created_at?: string | null;
                    deleted_at?: string | null;
                    email?: string;
                    full_name?: string | null;
                    role?: string;
                    updated_at?: string | null;
                    user_id?: string;
                    username?: string;
                };
                Relationships: [];
            };
            user_profiles: {
                Row: {
                    address: string | null;
                    bio: string | null;
                    deleted_at: string | null;
                    id: number;
                    phone: string | null;
                    portfolio_url: string | null;
                    user_id: string;
                };
                Insert: {
                    address?: string | null;
                    bio?: string | null;
                    deleted_at?: string | null;
                    id?: number;
                    phone?: string | null;
                    portfolio_url?: string | null;
                    user_id: string;
                };
                Update: {
                    address?: string | null;
                    bio?: string | null;
                    deleted_at?: string | null;
                    id?: number;
                    phone?: string | null;
                    portfolio_url?: string | null;
                    user_id?: string;
                };
                Relationships: [];
            };
            user_reputation: {
                Row: {
                    id: number;
                    score: number | null;
                    updated_at: string | null;
                    user_id: string;
                };
                Insert: {
                    id?: number;
                    score?: number | null;
                    updated_at?: string | null;
                    user_id: string;
                };
                Update: {
                    id?: number;
                    score?: number | null;
                    updated_at?: string | null;
                    user_id?: string;
                };
                Relationships: [];
            };
            user_skills: {
                Row: {
                    deleted_at: string | null;
                    id: number;
                    level: string | null;
                    skill_id: number;
                    user_id: string;
                    verified: boolean | null;
                };
                Insert: {
                    deleted_at?: string | null;
                    id?: number;
                    level?: string | null;
                    skill_id: number;
                    user_id: string;
                    verified?: boolean | null;
                };
                Update: {
                    deleted_at?: string | null;
                    id?: number;
                    level?: string | null;
                    skill_id?: number;
                    user_id?: string;
                    verified?: boolean | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'user_skills_skill_id_fkey';
                        columns: ['skill_id'];
                        isOneToOne: false;
                        referencedRelation: 'skills';
                        referencedColumns: ['id'];
                    },
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
    keyof Database,
    'public'
>];

export type Tables<
    DefaultSchemaTableNameOrOptions extends
        | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
              DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
            DefaultSchema['Views'])
      ? (DefaultSchema['Tables'] &
            DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R;
        }
          ? R
          : never
      : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema['Tables']
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
      ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
            Insert: infer I;
        }
          ? I
          : never
      : never;

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema['Tables']
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
      ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
            Update: infer U;
        }
          ? U
          : never
      : never;

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
        | keyof DefaultSchema['Enums']
        | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
        : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
      ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
      : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        | keyof DefaultSchema['CompositeTypes']
        | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
        : never = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
      ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
      : never;

export const Constants = {
    graphql_public: {
        Enums: {},
    },
    public: {
        Enums: {},
    },
} as const;
