import { Router } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Listing from '../models/Listing.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

/* ---------- Profile ---------- */
router.put('/profile', async (req, res) => {
  try {
    const name = String(req.body.name ?? req.user.name).trim();
    const phone = String(req.body.phone ?? '').trim();
    if (name.length < 2) return res.status(400).json({ message: 'Name must be at least 2 characters.' });
    if (phone && !/^\d{10}$/.test(phone)) return res.status(400).json({ message: 'Phone must be a 10-digit number.' });
    const updated = await User.findByIdAndUpdate(req.user._id, {
      name, phone,
      college: String(req.body.college ?? '').trim().slice(0, 120),
      address: String(req.body.address ?? '').trim().slice(0, 300)
    }, { new: true, runValidators: true });
    res.json({ user: updated.toSafeObject() });
  } catch (e) {
    res.status(400).json({ message: 'Could not save your profile.' });
  }
});

router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await bcrypt.compare(String(currentPassword || ''), user.passwordHash))) return res.status(400).json({ message: 'Current password is wrong.' });
    user.passwordHash = await bcrypt.hash(String(newPassword), 12);
    await user.save();
    res.json({ message: 'Password updated.' });
  } catch (e) {
    res.status(400).json({ message: 'Could not update the password.' });
  }
});

/* ---------- Favorites ---------- */
router.get('/favorites/ids', (req, res) => res.json({ ids: (req.user.favorites || []).map(String) }));

router.get('/favorites', async (req, res) => {
  const items = await Listing.find({ _id: { $in: req.user.favorites || [] } }).populate('sellerId', 'name email phone createdAt');
  res.json(items);
});

router.put('/favorites/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid listing ID.' });
    const id = String(req.params.id);
    const has = (req.user.favorites || []).some(f => String(f) === id);
    if (!has && !(await Listing.exists({ _id: id }))) return res.status(404).json({ message: 'Listing not found.' });
    await User.updateOne({ _id: req.user._id }, has ? { $pull: { favorites: id } } : { $addToSet: { favorites: id } });
    const fresh = await User.findById(req.user._id).select('favorites');
    res.json({ favorited: !has, ids: fresh.favorites.map(String) });
  } catch (e) {
    res.status(400).json({ message: 'Could not update favorites.' });
  }
});

/* ---------- Notifications ---------- */
router.get('/notifications/count', async (req, res) => res.json({ unread: await Notification.countDocuments({ userId: req.user._id, read: false }) }));

router.get('/notifications', async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50),
    Notification.countDocuments({ userId: req.user._id, read: false })
  ]);
  res.json({ items, unread });
});

router.put('/notifications/read-all', async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.json({ unread: 0 });
});

export default router;
