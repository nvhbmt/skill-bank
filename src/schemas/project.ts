import z from 'zod';

export const createProjectSchema = z.object({
    project_name: z
        .string()
        .min(1, 'Tên dự án không được để trống')
        .max(200, 'Tên dự án không được vượt quá 200 ký tự'),
    location: z
        .string()
        .max(200, 'Địa điểm không được vượt quá 200 ký tự')
        .optional(),
    category: z.string().min(1, 'Vui lòng chọn phân loại dự án'),
    start_date: z.string().min(1, 'Vui lòng chọn thời gian bắt đầu'),
    description: z
        .string()
        .max(5000, 'Mô tả không được vượt quá 5000 ký tự')
        .optional(),
});

export type CreateProjectSchema = z.infer<typeof createProjectSchema>;
