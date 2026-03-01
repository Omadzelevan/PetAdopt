import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });

  return transporter;
}

export async function sendVerificationEmail({ email, name, token }) {
  const link = `${config.clientUrl}/auth?verifyToken=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5;">
      <h2>Welcome to PetAdopt, ${name}!</h2>
      <p>Please verify your email to activate your account.</p>
      <p><a href="${link}">Verify email address</a></p>
      <p>If the button does not work, copy this link:</p>
      <p>${link}</p>
    </div>
  `;

  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    console.log('[Email verification link]', { email, link });
    return { delivered: false, previewUrl: link };
  }

  await activeTransporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Verify your PetAdopt account',
    html,
  });

  return { delivered: true };
}
