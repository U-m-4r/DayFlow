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

/** Invite an Admin-created employee: login link, temp credentials, and OTP. */
export async function sendEmployeeInvite(opts: {
  to: string;
  loginId: string;
  tempPassword: string;
  otp: string;
  inviteToken: string;
}) {
  const activateLink = `${clientUrl()}/activate?token=${opts.inviteToken}`;
  const signInLink = `${clientUrl()}/`;
  await getTransport().sendMail({
    from: 'Dayflow <no-reply@dayflow.local>',
    to: opts.to,
    subject: 'Activate your Dayflow account',
    html: `<h2>Welcome to Dayflow</h2>
<p>Your HR team created an account for you. Activate it with the details below.</p>
<p><a href="${activateLink}">Activate your account</a></p>
<p>Or <a href="${signInLink}">sign in</a> with these temporary credentials:</p>
<p><strong>Login ID:</strong> ${opts.loginId}</p>
<p><strong>Temporary Password:</strong> ${opts.tempPassword}</p>
<p><strong>One-time verification code:</strong> ${opts.otp}</p>
<p>The code expires in 15 minutes. You must verify it and set a new password before using Dayflow.</p>`,
  });
}

/** Resend a fresh invite OTP (same login link; credentials unchanged). */
export async function sendInviteOtp(to: string, otp: string) {
  await getTransport().sendMail({
    from: 'Dayflow <no-reply@dayflow.local>',
    to,
    subject: 'Your Dayflow verification code',
    html: `<p>Your Dayflow verification code is <strong>${otp}</strong>.</p>
<p>It expires in 15 minutes.</p>`,
  });
}
