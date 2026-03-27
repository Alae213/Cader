/**
 * Test script to verify Resend email integration
 * Run: npx tsx scripts/test-email.ts
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_VuvKfgjq_7vvhV7x7iqWPFwJbPuah5hsz';
const TEST_EMAIL = process.argv[2] || 'samadoa123@gmail.com';

async function sendTestEmail() {
  const resend = new Resend(RESEND_API_KEY);

  console.log('📧 Sending test email to:', TEST_EMAIL);

  try {
    const { data, error } = await resend.emails.send({
      from: 'Cader <onboarding@resend.dev>',
      to: [TEST_EMAIL],
      subject: 'Test Email from Cader - Subscription Renewal Reminder',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">✅ Test Email from Cader</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi there! 👋
              </p>
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                This is a test email from <strong style="color: #059669;">Cader</strong> to verify that the Resend email integration is working correctly.
              </p>
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                If you received this email, the subscription renewal reminder system is ready to go! 🎉
              </p>
              <table role="presentation" style="width: 100%; margin-top: 24px;">
                <tr>
                  <td style="text-align: center; padding: 16px; background: #f0fdf4; border-radius: 8px;">
                    <p style="margin: 0; color: #166534; font-weight: 600;">Email integration is working!</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                This is a test email from Cader. Sent at ${new Date().toISOString()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }

    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', data?.id);
    console.log('   Check your inbox at:', TEST_EMAIL);
  } catch (err) {
    console.error('❌ Failed to send:', err);
    process.exit(1);
  }
}

sendTestEmail();
