import { Router } from 'express';
import crypto from 'crypto';
import Listing from '../models/Listing.js';
import Order, { ORDER_FLOW, DELIVERY_METHODS } from '../models/Order.js';
import Review from '../models/Review.js';
import { protect } from '../middleware/auth.js';
import { notify } from '../utils/notify.js';

const router = Router();
const newRef = () => 'SK-' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
const same = (a, b) => String(a) === String(b);

// Place an order (payment is SIMULATED: no money moves and no card data is collected).
router.post('/', protect, async (req, res) => {
  try {
    const { listingId, fullName, phone, deliveryMethod, address } = req.body;
    const name = String(fullName || '').trim();
    const addr = String(address || '').trim();
    if (name.length < 2) return res.status(400).json({ message: 'Please enter your full name.' });
    if (!/^\d{10}$/.test(String(phone || ''))) return res.status(400).json({ message: 'Phone must be a 10-digit number.' });
    if (!DELIVERY_METHODS.includes(deliveryMethod)) return res.status(400).json({ message: 'Choose a delivery method.' });
    if (deliveryMethod !== 'Local pickup' && addr.length < 8) return res.status(400).json({ message: 'Please enter a delivery address (at least 8 characters).' });

    // Atomically reserve the listing so two buyers cannot order the same item.
    const listing = await Listing.findOneAndUpdate(
      { _id: listingId, status: 'available', sellerId: { $ne: req.user._id } },
      { status: 'reserved' },
      { new: true }
    );
    if (!listing) {
      const existing = await Listing.findById(listingId).select('sellerId status');
      if (!existing) return res.status(404).json({ message: 'Listing not found.' });
      if (same(existing.sellerId, req.user._id)) return res.status(400).json({ message: 'You cannot buy your own listing.' });
      return res.status(409).json({ message: 'Sorry, this item is no longer available.' });
    }

    let order;
    try {
      order = await Order.create({
        ref: newRef(), listingId: listing._id, buyerId: req.user._id, sellerId: listing.sellerId,
        title: listing.title, price: listing.price, image: listing.images?.[0] || '',
        fullName: name, phone, deliveryMethod, address: addr
      });
    } catch (err) {
      await Listing.updateOne({ _id: listing._id, status: 'reserved' }, { status: 'available' });
      throw err;
    }
    notify(req.user._id, `Order ${order.ref} placed for "${order.title}". Simulated payment successful.`, '/orders');
    notify(listing.sellerId, `New order ${order.ref} for "${order.title}".`, '/orders');
    res.status(201).json(order);
  } catch (e) {
    res.status(400).json({ message: 'Could not place the order.' });
  }
});

router.get('/mine', protect, async (req, res) => res.json(await Order.find({ buyerId: req.user._id }).sort({ createdAt: -1 })));
router.get('/selling', protect, async (req, res) => res.json(await Order.find({ sellerId: req.user._id }).sort({ createdAt: -1 })));

// Seller moves the order forward: Pending -> Confirmed -> Shipped -> Delivered.
router.put('/:id/advance', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!same(order.sellerId, req.user._id)) return res.status(403).json({ message: 'Only the seller can update this order.' });
    const i = ORDER_FLOW.indexOf(order.status);
    if (i === -1 || i >= ORDER_FLOW.length - 1) return res.status(400).json({ message: 'This order cannot be advanced further.' });
    order.status = ORDER_FLOW[i + 1];
    await order.save();
    if (order.status === 'Delivered') await Listing.updateOne({ _id: order.listingId }, { status: 'sold' });
    notify(order.buyerId, `Order ${order.ref} is now ${order.status}.`, '/orders');
    res.json(order);
  } catch (e) {
    res.status(400).json({ message: 'Could not update the order.' });
  }
});

// Buyer can cancel before the item ships.
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!same(order.buyerId, req.user._id)) return res.status(403).json({ message: 'Only the buyer can cancel this order.' });
    if (!['Pending', 'Confirmed'].includes(order.status)) return res.status(400).json({ message: 'This order can no longer be cancelled.' });
    order.status = 'Cancelled';
    await order.save();
    await Listing.updateOne({ _id: order.listingId, status: 'reserved' }, { status: 'available' });
    notify(order.sellerId, `Order ${order.ref} was cancelled by the buyer.`, '/orders');
    res.json(order);
  } catch (e) {
    res.status(400).json({ message: 'Could not cancel the order.' });
  }
});

// Buyer rates the seller after delivery. The rating feeds the seller trust score through the Review model.
router.post('/:id/review', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!same(order.buyerId, req.user._id)) return res.status(403).json({ message: 'Only the buyer can rate this order.' });
    if (order.status !== 'Delivered') return res.status(400).json({ message: 'You can rate the seller after delivery.' });
    if (order.reviewed) return res.status(400).json({ message: 'You have already rated this order.' });
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be from 1 to 5.' });
    await Review.create({ sellerId: order.sellerId, buyerId: order.buyerId, listingId: order.listingId, rating, comment: String(req.body.comment || '').slice(0, 500) });
    order.reviewed = true;
    order.rating = rating;
    await order.save();
    notify(order.sellerId, `You received a ${rating}★ rating for order ${order.ref}.`, '/orders');
    res.status(201).json(order);
  } catch (e) {
    res.status(400).json({ message: 'You may have already rated this item.' });
  }
});

export default router;
