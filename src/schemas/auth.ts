import z from 'zod';

export const signupSchema = z.object({
    email: z.email('Email không hợp lệ'),
    username: z
        .string()
        .min(3, 'Username phải có ít nhất 3 ký tự')
        .max(20, 'Username không được vượt quá 20 ký tự'),
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
    fullName: z
        .string()
        .min(3, 'Tên phải có ít nhất 3 ký tự')
        .max(50, 'Tên không được vượt quá 50 ký tự'),
});

export type SignupSchema = z.infer<typeof signupSchema>;

export const signinSchema = z.object({
    username: z.string().min(3, 'Username phải có ít nhất 3 ký tự'),
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

export type SigninSchema = z.infer<typeof signinSchema>;

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
        password: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
        confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Mật khẩu xác nhận không khớp',
        path: ['confirmPassword'],
    });

export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;
