import z from 'zod';

/**
 * `formData.get('x')` trả về `null` khi trường không được gửi lên, trong khi
 * `.optional()` của Zod chỉ chấp nhận `undefined`. Vì vậy bỏ trống một trường
 * không bắt buộc lại làm cả request hỏng với thông báo khó hiểu
 * "expected string, received null". Dùng `.nullish()` để nhận cả hai.
 */
export const createProjectSchema = z.object({
    project_name: z
        .string()
        .min(1, 'Tên dự án không được để trống')
        .max(200, 'Tên dự án không được vượt quá 200 ký tự'),
    location: z
        .string()
        .max(200, 'Địa điểm không được vượt quá 200 ký tự')
        .nullish(),
    category: z.string().min(1, 'Vui lòng chọn phân loại dự án'),
    start_date: z.string().min(1, 'Vui lòng chọn thời gian bắt đầu'),
    description: z
        .string()
        .max(5000, 'Mô tả không được vượt quá 5000 ký tự')
        .nullish(),
});

export type CreateProjectSchema = z.infer<typeof createProjectSchema>;
