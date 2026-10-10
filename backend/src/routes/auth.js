import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { protect } from '../middleware/auth.js';
import { notify } from '../utils/notify.js';
import {
  otpEnabled, createChallenge, challengeResponse, makeCode, deliverOtp,
  OTP_TTL_MS, OTP_MAX_ATTEMPTS, OTP_RESEND_MS
} from '../utils/otp.js';

const router = Router();
const tokenFor = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

async function createUser({ name, email, phone, role, passwordHash }) {
  const user = await User.create({ name, email, phone, role, passwordHash });
  notify(user._id, 'Welcome to SecondKart! Browse listings, save favorites and track your orders here.', '/listings');
  return user;
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password || password.length < 8) return res.status(400).json({ message: 'Name, email and a password of at least 8 characters are required.' });
    if (!['buyer', 'seller'].includes(role || 'buyer')) return res.status(400).json({ message: 'Choose Buyer or Seller during registration.' });
    const mail = String(email).toLowerCase().trim();
    if (await User.findOne({ email: mail })) return res.status(409).json({ message: 'An account with this email already exists.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const pending = { name, email: mail, phone, role: role || 'buyer', passwordHash };

    if (!otpEnabled()) {
      const user = await createUser(pending);
      return res.status(201).json({ token: tokenFor(user), user: user.toSafeObject() });
    }
    const ch = await createChallenge({ purpose: 'register', email: mail, pending });
    res.status(202).json(challengeResponse({ ...ch, email: mail }));
  } catch (e) {
    res.status(500).json({ message: 'Could not create account.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: String(req.body.email || '').toLowerCase() }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(req.body.password || '', user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    if (!otpEnabled()) return res.json({ token: tokenFor(user), user: user.toSafeObject() });
    const ch = await createChallenge({ purpose: 'login', email: user.email, userId: user._id });
    res.status(202).json(challengeResponse({ ...ch, email: user.email }));
  } catch (e) {
    res.status(500).json({ message: 'Could not log in.' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { challengeId, code } = req.body;
    const ch = await Otp.findOne({ challengeId: String(challengeId || '') });
    if (!ch || ch.expiresAt < new Date()) {
      if (ch) await ch.deleteOne();
      return res.status(400).json({ message: 'This code has expired. Please start again.', restart: true });
    }
    if (!/^\d{6}$/.test(String(code || '')) || !(await bcrypt.compare(String(code), ch.codeHash))) {
      ch.attempts += 1;
      if (ch.attempts >= OTP_MAX_ATTEMPTS) {
        await ch.deleteOne();
        return res.status(400).json({ message: 'Too many wrong attempts. Please start again.', restart: true });
      }
      await ch.save();
      return res.status(400).json({ message: `Wrong code. ${OTP_MAX_ATTEMPTS - ch.attempts} attempt(s) left.` });
    }
    await ch.deleteOne();
    let user;
    if (ch.purpose === 'register') {
      if (await User.findOne({ email: ch.pending.email })) return res.status(409).json({ message: 'An account with this email already exists.', restart: true });
      user = await createUser(ch.pending);
    } else {
      user = await User.findById(ch.userId);
      if (!user) return res.status(401).json({ message: 'Account not found.', restart: true });
    }
    res.json({ token: tokenFor(user), user: user.toSafeObject() });
  } catch (e) {
    res.status(500).json({ message: 'Could not verify the code.' });
  }
});

router.post('/resend-otp', async (req, res) => {
  try {
    const ch = await Otp.findOne({ challengeId: String(req.body.challengeId || '') });
    if (!ch) return res.status(400).json({ message: 'Please start again.', restart: true });
    if (Date.now() - ch.lastSentAt.getTime() < OTP_RESEND_MS) return res.status(429).json({ message: 'Please wait a few seconds before requesting another code.' });
    const code = makeCode();
    ch.codeHash = await bcrypt.hash(code, 8);
    ch.attempts = 0;
    ch.lastSentAt = new Date();
    ch.expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await ch.save();
    deliverOtp(ch.email, code);
    res.json(challengeResponse({ challengeId: ch.challengeId, code, email: ch.email }));
  } catch (e) {
    res.status(500).json({ message: 'Could not resend the code.' });
  }
});

router.get('/me', protect, (req, res) => res.json({ user: req.user.toSafeObject() }));
export default router;
