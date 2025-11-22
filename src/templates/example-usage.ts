/**
 * Example usage of OTP email template
 * 
 * This file demonstrates how to use the email template utility
 * with different email services.
 */

import { getOTPResetEmailTemplate } from '@/utils/email-template';

// Example 1: Using with a custom email service (Resend, SendGrid, etc.)
export async function sendOTPEmailExample(
    userEmail: string,
    otpCode: string,
    origin: string,
    lang: 'vi' | 'en' = 'vi'
) {
    // Generate email HTML
    const emailHtml = getOTPResetEmailTemplate({
        otpCode,
        expiryMinutes: 10,
        logoUrl: `${origin}/assets/images/logo.png`,
        resetUrl: `${origin}/${lang}/enter-code`,
        siteUrl: origin,
        lang,
    });

    // Example with a hypothetical email service
    // Replace this with your actual email service
    /*
    await emailService.send({
        to: userEmail,
        subject: lang === 'vi' 
            ? 'Mã OTP Khôi Phục Mật Khẩu - SkillBank'
            : 'Password Reset OTP Code - SkillBank',
        html: emailHtml,
        from: 'noreply@skillbank.com',
    });
    */
    
    return emailHtml;
}

// Example 2: Using with Supabase (if you have custom email service configured)
export async function sendOTPWithSupabaseExample(
    email: string,
    origin: string,
    lang: 'vi' | 'en' = 'vi'
) {
    // Note: Supabase's signInWithOtp uses its own email templates
    // If you want to use custom templates, you need to:
    // 1. Configure custom SMTP in Supabase Dashboard
    // 2. Use a webhook to intercept and customize the email
    // 3. Or use a separate email service after Supabase generates the OTP
    
    // This is just an example structure
    /*
    const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: `${origin}/${lang}/enter-code`,
            // Custom email template would be configured in Supabase Dashboard
        },
    });
    
    // If you need to send a custom email, you would:
    // 1. Get the OTP token from Supabase (via webhook or database)
    // 2. Generate custom email HTML
    // 3. Send via your email service
    */
}

// Example 3: Generate email HTML for preview/testing
export function generateEmailPreview() {
    const html = getOTPResetEmailTemplate({
        otpCode: '123456',
        expiryMinutes: 10,
        logoUrl: 'https://yourdomain.com/assets/images/logo.png',
        resetUrl: 'https://yourdomain.com/vi/enter-code',
        siteUrl: 'https://yourdomain.com',
        lang: 'vi',
    });
    
    // Save to file for preview
    // fs.writeFileSync('email-preview.html', html);
    
    return html;
}

