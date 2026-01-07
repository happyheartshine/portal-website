import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * Stub email service for development
   * In production, replace with actual email provider (SendGrid, AWS SES, etc.)
   */
  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    // In development, log to console
    // In production, send actual email
    this.logger.log(`📧 Password Reset OTP for ${email}: ${otp}`);
    this.logger.log(`   (In production, this would be sent via email)`);
    
    // Example production implementation:
    // await this.emailProvider.send({
    //   to: email,
    //   subject: 'Password Reset OTP',
    //   text: `Your password reset OTP is: ${otp}. It expires in 10 minutes.`,
    // });
  }
}

