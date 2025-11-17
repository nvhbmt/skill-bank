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
