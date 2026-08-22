/** Development mail uses MailHog; production can supply regular SMTP environment values. */
import nodemailer from 'nodemailer';

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT || 1025),
    secure: false,
  });
}

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';

/** Send the email-verification link after company signup. */
export async function sendVerification(to: string, token: string) {
  const link = `${clientUrl()}/verify-email?token=${token}`;
  await getTransport().sendMail({
    from: 'Dayflow <no-reply@dayflow.local>',
    to,
    subject: 'Verify your Dayflow email',
    html: `<h2>Welcome to Dayflow</h2><p>Click the link below to verify your email address:</p><p><a href="${link}">${link}</a></p>`,
  });
}

/** Send auto-generated credentials when Admin creates a new employee. */
export async function sendCredentials(to: string, loginId: string, tempPassword: string) {
  await getTransport().sendMail({
    from: 'Dayflow <no-reply@dayflow.local>',
    to,
    subject: 'Your Dayflow login credentials',
    html: `<h2>Welcome to Dayflow</h2>
<p>Your account has been created. Use the credentials below to sign in:</p>
<p><strong>Login ID:</strong> ${loginId}</p>
<p><strong>Temporary Password:</strong> ${tempPassword}</p>
<p>You will be asked to change your password on first login.</p>`,
  });
}
