import { Router } from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Listing from '../models/Listing.js';
import Enquiry from '../models/Enquiry.js';
import Order from '../models/Order.js';
import { protect } from '../middleware/auth.js';
import { getOrCreateConversation, addMessage, isBuyerOf } from '../utils/chat.js';

const router = Router();
router.use(protect);

const valid = id => mongoose.isValidObjectId(id);
const sameId = (a, b) => String(a?._id ?? a) === String(b?._id ?? b);

// Loads a conversation and checks that the signed-in user is one of the two participants.
async function loadMine(req, res) {
  if (!valid(req.params.id)) { res.status(400).json({ message: 'Invalid conversation.' }); return null; }
  const conv = await Conversation.findById(req.params.id);
  if (!conv) { res.status(404).json({ message: 'Conversation not found.' }); return null; }
  if (!sameId(conv.buyerId, req.user._id) && !sameId(conv.sellerId, req.user._id)) {
    res.status(403).json({ message: 'This conversation is not yours.' }); return null;
  }
  return conv;
}

async function shape(conv, meId) {
  const iAmBuyer = sameId(conv.buyerId, meId); // decide the role before populate, from the raw ids
  await conv.populate([
    { path: 'buyerId', select: 'name' },
    { path: 'sellerId', select: 'name' },
    { path: 'listingId', select: 'title price images status' }
  ]);
  const other = iAmBuyer ? conv.sellerId : conv.buyerId;
  const l = conv.listingId;
  return {
    _id: conv._id,
    role: iAmBuyer ? 'buyer' : 'seller',
    other: { _id: other?._id || null, name: other?.name || 'Deleted user' },
    listing: {
      _id: l?._id || null,
      title: l?.title || conv.listingTitle || 'Removed listing',
      price: l?.price ?? null,
      image: l?.images?.[0] || conv.listingImage || '',
      status: l?.status || 'removed'
    },
    lastMessage: conv.lastMessage,
    lastMessageAt: conv.lastMessageAt,
    lastSenderId: conv.lastSenderId,
    unread: iAmBuyer ? conv.buyerUnread : conv.sellerUnread,
    createdAt: conv.createdAt
  };
}

// Total unread messages (drives the navbar badge).
router.get('/unread-count', async (req, res) => {
  try {
    const rows = await Conversation.find({ $or: [{ buyerId: req.user._id }, { sellerId: req.user._id }] }).select('buyerId buyerUnread sellerUnread');
    const unread = rows.reduce((n, c) => n + (sameId(c.buyerId, req.user._id) ? c.buyerUnread : c.sellerUnread), 0);
    res.json({ unread });
  } catch (e) { res.status(500).json({ message: 'Could not load unread count.' }); }
});

// Inbox: every conversation that has at least one message, newest first.
router.get('/conversations', async (req, res) => {
  try {
    const rows = await Conversation.find({
      $or: [{ buyerId: req.user._id }, { sellerId: req.user._id }],
      lastMessageAt: { $ne: null }
    }).sort({ lastMessageAt: -1 }).limit(100);
    res.json(await Promise.all(rows.map(c => shape(c, req.user._id))));
  } catch (e) { res.status(500).json({ message: 'Could not load your chats.' }); }
});

// Open (or create) a chat about a listing.
// Buyer: { listingId }.  Seller replying to an enquirer/buyer: { listingId, buyerId }.
router.post('/start', async (req, res) => {
  try {
    const { listingId, buyerId } = req.body || {};
    if (!valid(listingId)) return res.status(400).json({ message: 'Invalid listing.' });
    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });

    const iAmSeller = sameId(listing.sellerId, req.user._id);
    let buyer = req.user._id;
    if (iAmSeller) {
      if (!valid(buyerId)) return res.status(400).json({ message: 'Choose a buyer to reply to.' });
      buyer = buyerId;
      if (sameId(buyer, req.user._id)) return res.status(400).json({ message: 'You cannot chat with yourself.' });
    }

    let conv = await Conversation.findOne({ listingId: listing._id, buyerId: buyer });
    if (!conv) {
      if (iAmSeller) {
        // A seller can only open a chat with someone who has already enquired about or ordered the item.
        const [asked, ordered] = await Promise.all([
          Enquiry.exists({ listingId: listing._id, fromUserId: buyer, sellerId: req.user._id }),
          Order.exists({ listingId: listing._id, buyerId: buyer, sellerId: req.user._id })
        ]);
        if (!asked && !ordered) return res.status(403).json({ message: 'You can reply only to buyers who contacted you about this item.' });
      } else if (listing.status === 'sold' && !(await Order.exists({ listingId: listing._id, buyerId: buyer }))) {
        return res.status(400).json({ message: 'This item has already been sold.' });
      }
      conv = await getOrCreateConversation(listing, buyer, { importEnquiries: true });
    }
    res.json(await shape(conv, req.user._id));
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: 'Could not open the chat.' });
  }
});

router.get('/conversations/:id', async (req, res) => {
  try {
    const conv = await loadMine(req, res); if (!conv) return;
    res.json(await shape(conv, req.user._id));
  } catch (e) { res.status(500).json({ message: 'Could not load the chat.' }); }
});

// Messages. Without ?after you get the latest 300; with ?after=<messageId> only newer ones (used for polling).
// Reading marks the conversation as read for the signed-in user.
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const conv = await loadMine(req, res); if (!conv) return;
    const after = req.query.after;
    let messages;
    if (after && valid(after)) {
      messages = await Message.find({ conversationId: conv._id, _id: { $gt: after } }).sort({ _id: 1 }).limit(200);
    } else {
      messages = (await Message.find({ conversationId: conv._id }).sort({ _id: -1 }).limit(300)).reverse();
    }
    const unreadField = isBuyerOf(conv, req.user._id) ? 'buyerUnread' : 'sellerUnread';
    if (conv[unreadField] > 0) await Conversation.updateOne({ _id: conv._id }, { $set: { [unreadField]: 0 } });
    res.json({
      messages: messages.map(m => ({ _id: m._id, senderId: m.senderId, text: m.text, createdAt: m.createdAt }))
    });
  } catch (e) { res.status(500).json({ message: 'Could not load messages.' }); }
});

router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const conv = await loadMine(req, res); if (!conv) return;
    const text = String(req.body?.text ?? '').trim();
    if (!text) return res.status(400).json({ message: 'Please write a message.' });
    if (text.length > 1000) return res.status(400).json({ message: 'Messages can be at most 1000 characters.' });
    const msg = await addMessage(conv, req.user, text);
    res.status(201).json({ message: { _id: msg._id, senderId: msg.senderId, text: msg.text, createdAt: msg.createdAt } });
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: 'Could not send your message.' });
  }
});

export default router;
