import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Otp from '../models/Otp.js';

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 3;
export const OTP_RESEND_MS = 20 * 1000;

export const otpEnabled = () => process.env.OTP_ENABLED !== 'false';
// 'demo' (default): the code is returned to the client so it can be shown on screen. No email/SMS provider is wired in.
export const otpDemoMode = () => (process.env.OTP_MODE || 'demo') === 'demo';

export const makeCode = () => String(crypto.randomInt(100000, 1000000));

// Replace this with a real email/SMS provider (e.g. nodemailer) for production.
export function deliverOtp(email, code) {
  console.log(`[OTP] code for ${email}: ${code} (valid 5 minutes)`);
}

export async function createChallenge({ purpose, email, userId = null, pending }) {
  const code = makeCode();
  const challengeId = crypto.randomBytes(16).toString('hex');
  await Otp.create({
    challengeId, purpose, email, userId, pending,
    codeHash: await bcrypt.hash(code, 8),
    expiresAt: new Date(Date.now() + OTP_TTL_MS)
  });
  deliverOtp(email, code);
  return { challengeId, code };
}

export function challengeResponse({ challengeId, code, email }) {
  return {
    otpRequired: true,
    challengeId,
    email,
    expiresInSeconds: OTP_TTL_MS / 1000,
    ...(otpDemoMode() ? { devCode: code } : {})
  };
}
