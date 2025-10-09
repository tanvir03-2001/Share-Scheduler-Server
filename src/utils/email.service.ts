import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { Logger } from './logger';

// Ensure environment variables are loaded
dotenv.config();

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        // Use Gmail service for better compatibility
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Verify connection configuration
        this.verifyConnection();
    }

    private async verifyConnection(): Promise<void> {
        try {
            await this.transporter.verify();
            Logger.info('Email service connected successfully');
        } catch (error) {
            Logger.error('Email service connection failed:', error);
        }
    }

    async sendEmail(options: EmailOptions): Promise<boolean> {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text
            };

            const result = await this.transporter.sendMail(mailOptions);
            Logger.info('Email sent successfully', {
                to: options.to,
                subject: options.subject,
                messageId: result.messageId
            });
            return true;
        } catch (error) {
            Logger.error('Failed to send email:', error);
            return false;
        }
    }

    async sendVerificationEmail(email: string, verificationToken: string, userName: string): Promise<boolean> {
        const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
        const verificationUrl = `${frontendUrl}/auth/verify-email?token=${verificationToken}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Email Verification</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: #f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                    }
                    .button {
                        display: inline-block;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 15px 30px;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                        font-weight: bold;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #666;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Welcome to Facebook Auto Post!</h1>
                </div>
                <div class="content">
                    <h2>Hello ${userName}!</h2>
                    <p>Thank you for signing up for our Facebook Auto Post service. To complete your registration and start using our platform, please verify your email address by clicking the button below:</p>
                    
                    <div style="text-align: center;">
                        <a href="${verificationUrl}" class="button">Verify Email Address</a>
                    </div>
                    
                    <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background: #e9e9e9; padding: 10px; border-radius: 5px;">
                        ${verificationUrl}
                    </p>
                    
                    <p><strong>Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
                    
                    <p>If you didn't create an account with us, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>Best regards,<br>The Facebook Auto Post Team</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </body>
            </html>
        `;

        const text = `
            Welcome to Facebook Auto Post!
            
            Hello ${userName}!
            
            Thank you for signing up for our Facebook Auto Post service. To complete your registration and start using our platform, please verify your email address by visiting the following link:
            
            ${verificationUrl}
            
            Important: This verification link will expire in 24 hours for security reasons.
            
            If you didn't create an account with us, please ignore this email.
            
            Best regards,
            The Facebook Auto Post Team
        `;

        return await this.sendEmail({
            to: email,
            subject: 'Verify Your Email - Facebook Auto Post',
            html,
            text
        });
    }

    async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<boolean> {
        const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
        const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: #f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                    }
                    .button {
                        display: inline-block;
                        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                        color: white;
                        padding: 15px 30px;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                        font-weight: bold;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #666;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                    <h2>Hello ${userName}!</h2>
                    <p>We received a request to reset your password for your Facebook Auto Post account. If you made this request, click the button below to reset your password:</p>
                    
                    <div style="text-align: center;">
                        <a href="${resetUrl}" class="button">Reset Password</a>
                    </div>
                    
                    <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background: #e9e9e9; padding: 10px; border-radius: 5px;">
                        ${resetUrl}
                    </p>
                    
                    <p><strong>Important:</strong> This reset link will expire in 1 hour for security reasons.</p>
                    
                    <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                </div>
                <div class="footer">
                    <p>Best regards,<br>The Facebook Auto Post Team</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </body>
            </html>
        `;

        const text = `
            Password Reset Request
            
            Hello ${userName}!
            
            We received a request to reset your password for your Facebook Auto Post account. If you made this request, visit the following link to reset your password:
            
            ${resetUrl}
            
            Important: This reset link will expire in 1 hour for security reasons.
            
            If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            
            Best regards,
            The Facebook Auto Post Team
        `;

        return await this.sendEmail({
            to: email,
            subject: 'Password Reset - Facebook Auto Post',
            html,
            text
        });
    }
}

// Export singleton instance
export const emailService = new EmailService();
