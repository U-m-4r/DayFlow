/** Development mail uses MailHog; production can supply regular SMTP environment values. */
import nodemailer from 'nodemailer';
export async function sendVerification(to:string, token:string) {
  const transport = nodemailer.createTransport({host:process.env.SMTP_HOST || 'localhost',port:Number(process.env.SMTP_PORT || 1025),secure:false});
  const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  await transport.sendMail({from:'Dayflow <no-reply@dayflow.local>',to,subject:'Verify your Dayflow email',text:`Verify your account: ${link}`});
}
