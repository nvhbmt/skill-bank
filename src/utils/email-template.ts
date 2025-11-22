/**
 * Email template utilities for OTP reset password
 */

export interface OTPEmailParams {
    otpCode: string;
    expiryMinutes?: number;
    logoUrl?: string;
    resetUrl?: string;
    siteUrl?: string;
    lang?: 'vi' | 'en';
}

/**
 * Get email template HTML with OTP code
 */
export function getOTPResetEmailTemplate(params: OTPEmailParams): string {
    const {
        otpCode,
        expiryMinutes = 10,
        logoUrl = 'https://yourdomain.com/assets/images/logo.png',
        resetUrl = 'https://yourdomain.com/vi/enter-code',
        siteUrl = 'https://yourdomain.com',
        lang = 'vi',
    } = params;

    // Load template
    const template = getEmailTemplate(lang);

    // Replace placeholders
    return template
        .replace(/\{\{OTP_CODE\}\}/g, otpCode)
        .replace(/\{\{EXPIRY_MINUTES\}\}/g, expiryMinutes.toString())
        .replace(/\{\{LOGO_URL\}\}/g, logoUrl)
        .replace(/\{\{RESET_URL\}\}/g, resetUrl)
        .replace(/\{\{SITE_URL\}\}/g, siteUrl);
}

/**
 * Get email template based on language
 */
function getEmailTemplate(lang: 'vi' | 'en'): string {
    if (lang === 'en') {
        return getEnglishTemplate();
    }
    return getVietnameseTemplate();
}

/**
 * Vietnamese email template
 */
function getVietnameseTemplate(): string {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Mã OTP Khôi Phục Mật Khẩu - SkillBank</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {font-family: Arial, sans-serif !important;}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f1a; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <!-- Wrapper Table -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0f1a; background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px); background-size: 50px 50px;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <!-- Main Container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);">
                    <!-- Header with Logo -->
                    <tr>
                        <td align="center" style="padding: 40px 40px 20px 40px;">
                            <img src="{{LOGO_URL}}" alt="SkillBank Logo" style="max-width: 180px; height: auto; display: block;" />
                        </td>
                    </tr>
                    
                    <!-- Title -->
                    <tr>
                        <td align="center" style="padding: 0 40px 20px 40px;">
                            <h1 style="margin: 0; font-size: 32px; font-weight: 800; line-height: 1.2; color: #ffffff; text-transform: uppercase; letter-spacing: -0.5px;">
                                Khôi Phục<br/>
                                <span style="background: linear-gradient(135deg, #fff 0%, #a78bfa 50%, #c4b5fd 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Mật Khẩu</span>
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Subtitle -->
                    <tr>
                        <td align="center" style="padding: 0 40px 30px 40px;">
                            <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #d1d5db; max-width: 100%;">
                                Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã OTP bên dưới để tiếp tục.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- OTP Code Box -->
                    <tr>
                        <td align="center" style="padding: 0 40px 30px 40px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%); border: 2px solid rgba(124, 58, 237, 0.5); border-radius: 12px; padding: 30px 20px; box-shadow: 0 0 20px rgba(124, 58, 237, 0.3);">
                                        <p style="margin: 0 0 15px 0; font-size: 14px; color: #a78bfa; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                            Mã OTP Của Bạn
                                        </p>
                                        <div style="font-size: 42px; font-weight: 800; letter-spacing: 8px; color: #ffffff; font-family: 'Courier New', monospace; text-align: center; background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 8px; display: inline-block; min-width: 280px;">
                                            {{OTP_CODE}}
                                        </div>
                                        <p style="margin: 15px 0 0 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                                            Mã này sẽ hết hạn sau <strong style="color: #a78bfa;">{{EXPIRY_MINUTES}}</strong> phút
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Instructions -->
                    <tr>
                        <td style="padding: 0 40px 30px 40px;">
                            <div style="background: rgba(255, 255, 255, 0.02); border-left: 3px solid #7c3aed; padding: 20px; border-radius: 8px;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #ffffff;">
                                    📋 Hướng dẫn:
                                </p>
                                <ul style="margin: 0; padding-left: 20px; color: #d1d5db; font-size: 14px; line-height: 1.8;">
                                    <li>Nhập mã OTP vào trang xác thực</li>
                                    <li>Mã OTP chỉ có hiệu lực trong thời gian giới hạn</li>
                                    <li>Không chia sẻ mã này với bất kỳ ai</li>
                                    <li>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email</li>
                                </ul>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Button (Alternative) -->
                    <tr>
                        <td align="center" style="padding: 0 40px 30px 40px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); border-radius: 30px; box-shadow: 0 0 20px rgba(124, 58, 237, 0.5);">
                                        <a href="{{RESET_URL}}" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 30px;">
                                            Đi Đến Trang Xác Thực →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer Text -->
                    <tr>
                        <td align="center" style="padding: 0 40px 40px 40px;">
                            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #9ca3af;">
                                Nếu bạn gặp vấn đề, vui lòng liên hệ với chúng tôi qua email hỗ trợ.
                            </p>
                            <p style="margin: 15px 0 0 0; font-size: 12px; color: #6b7280;">
                                Email này được gửi tự động, vui lòng không trả lời trực tiếp.
                            </p>
                        </td>
                    </tr>
                </table>
                
                <!-- Footer -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin-top: 30px;">
                    <tr>
                        <td align="center" style="padding: 20px;">
                            <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.6;">
                                © 2024 SkillBank. Tất cả quyền được bảo lưu.<br/>
                                <a href="{{SITE_URL}}" style="color: #a78bfa; text-decoration: none;">{{SITE_URL}}</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/**
 * English email template
 */
function getEnglishTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Password Reset OTP Code - SkillBank</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {font-family: Arial, sans-serif !important;}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f1a; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <!-- Wrapper Table -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0f1a; background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px); background-size: 50px 50px;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <!-- Main Container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);">
                    <!-- Header with Logo -->
                    <tr>
                        <td align="center" style="padding: 40px 40px 20px 40px;">
                            <img src="{{LOGO_URL}}" alt="SkillBank Logo" style="max-width: 180px; height: auto; display: block;" />
                        </td>
                    </tr>
                    
                    <!-- Title -->
                    <tr>
                        <td align="center" style="padding: 0 40px 20px 40px;">
                            <h1 style="margin: 0; font-size: 32px; font-weight: 800; line-height: 1.2; color: #ffffff; text-transform: uppercase; letter-spacing: -0.5px;">
                                Reset<br/>
                                <span style="background: linear-gradient(135deg, #fff 0%, #a78bfa 50%, #c4b5fd 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Password</span>
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Subtitle -->
                    <tr>
                        <td align="center" style="padding: 0 40px 30px 40px;">
                            <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #d1d5db; max-width: 100%;">
                                We received a password reset request for your account. Please use the OTP code below to continue.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- OTP Code Box -->
                    <tr>
                        <td align="center" style="padding: 0 40px 30px 40px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%); border: 2px solid rgba(124, 58, 237, 0.5); border-radius: 12px; padding: 30px 20px; box-shadow: 0 0 20px rgba(124, 58, 237, 0.3);">
                                        <p style="margin: 0 0 15px 0; font-size: 14px; color: #a78bfa; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                            Your OTP Code
                                        </p>
                                        <div style="font-size: 42px; font-weight: 800; letter-spacing: 8px; color: #ffffff; font-family: 'Courier New', monospace; text-align: center; background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 8px; display: inline-block; min-width: 280px;">
                                            {{OTP_CODE}}
                                        </div>
                                        <p style="margin: 15px 0 0 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                                            This code will expire in <strong style="color: #a78bfa;">{{EXPIRY_MINUTES}}</strong> minutes
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Instructions -->
                    <tr>
                        <td style="padding: 0 40px 30px 40px;">
                            <div style="background: rgba(255, 255, 255, 0.02); border-left: 3px solid #7c3aed; padding: 20px; border-radius: 8px;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #ffffff;">
                                    📋 Instructions:
                                </p>
                                <ul style="margin: 0; padding-left: 20px; color: #d1d5db; font-size: 14px; line-height: 1.8;">
                                    <li>Enter the OTP code on the verification page</li>
                                    <li>The OTP code is only valid for a limited time</li>
                                    <li>Do not share this code with anyone</li>
                                    <li>If you did not request this code, please ignore this email</li>
                                </ul>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Button (Alternative) -->
                    <tr>
                        <td align="center" style="padding: 0 40px 30px 40px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); border-radius: 30px; box-shadow: 0 0 20px rgba(124, 58, 237, 0.5);">
                                        <a href="{{RESET_URL}}" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 30px;">
                                            Go to Verification Page →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer Text -->
                    <tr>
                        <td align="center" style="padding: 0 40px 40px 40px;">
                            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #9ca3af;">
                                If you encounter any issues, please contact us via support email.
                            </p>
                            <p style="margin: 15px 0 0 0; font-size: 12px; color: #6b7280;">
                                This is an automated email, please do not reply directly.
                            </p>
                        </td>
                    </tr>
                </table>
                
                <!-- Footer -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin-top: 30px;">
                    <tr>
                        <td align="center" style="padding: 20px;">
                            <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.6;">
                                © 2024 SkillBank. All rights reserved.<br/>
                                <a href="{{SITE_URL}}" style="color: #a78bfa; text-decoration: none;">{{SITE_URL}}</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

