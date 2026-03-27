/**
 * Email utility for sending subscription renewal reminders using Resend.
 * 
 * This file uses "use node" directive to enable Node.js runtime for Resend SDK.
 */
"use node";

import { Resend } from 'resend';

interface RenewalEmailParams {
  to: string;
  userName: string;
  communityName: string;
  expiryDate: Date;
  renewalUrl: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Initialize Resend client (lazy initialization to avoid errors if API key is missing)
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured - emails will be logged only');
    return null;
  }
  
  resendClient = new Resend(apiKey);
  return resendClient;
}

/**
 * Send a subscription renewal reminder email.
 */
export async function sendRenewalReminderEmail(params: RenewalEmailParams): Promise<EmailResult> {
  const { to, userName, communityName, expiryDate, renewalUrl } = params;
  
  const expiryDateStr = expiryDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject = `Your subscription to ${communityName} expires soon`;
  const html = generateRenewalEmailHtml(params);

  // Try to send via Resend
  const resend = getResendClient();
  
  if (!resend) {
    // No API key - log to console for development
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📧 EMAIL (Resend not configured - logged only)              ║
╠══════════════════════════════════════════════════════════════╣
║  To: ${to.padEnd(54)}║
║  Subject: ${subject.substring(0, 48).padEnd(48)}║
╠══════════════════════════════════════════════════════════════╣
║  Hi ${userName},                                                    
║                                                              
║  Your subscription to ${communityName} will expire on ${expiryDateStr}.
║                                                              
║  Renew here: ${renewalUrl.substring(0, 45)}...
║                                                              
╚══════════════════════════════════════════════════════════════╝
    `);
    return { success: true, messageId: `log-${Date.now()}` };
  }

  try {
    const from = process.env.EMAIL_FROM || 'Cader <noreply@cader.dz>';
    
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Resend API error:', error);
      return { success: false, error: JSON.stringify(error) };
    }

    console.log(`Email sent to ${to}: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('Failed to send email:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Generate HTML email content for renewal reminder.
 */
function generateRenewalEmailHtml(params: RenewalEmailParams): string {
  const { userName, communityName, expiryDate, renewalUrl } = params;
  const expiryDateStr = expiryDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Expiring Soon</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Subscription Expiring Soon</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi <strong>${userName}</strong>,
              </p>
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Your subscription to <strong style="color: #059669;">${communityName}</strong> will expire on <strong>${expiryDateStr}</strong>.
              </p>
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                To continue enjoying access to this community, please renew your subscription before the expiry date.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding: 16px 0;">
                    <a href="${renewalUrl}" style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Renew Subscription
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you don't renew before the expiry date, you'll lose access to the community and all its content.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                This is an automated reminder from Cader. You're receiving this because you have an active subscription.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Send a test email to verify Resend configuration.
 */
export async function sendTestEmail(to: string): Promise<EmailResult> {
  return sendRenewalReminderEmail({
    to,
    userName: 'Test User',
    communityName: 'Test Community',
    expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    renewalUrl: 'https://cader.dz/test?renew=true',
  });
}
