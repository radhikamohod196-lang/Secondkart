import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Enquiry from '../models/Enquiry.js';
import { notify } from './notify.js';

export const isBuyerOf = (conv, userId) => String(conv.buyerId) === String(userId);

// Find the conversation for (listing, buyer) or create it. Safe if two requests race.
// With importEnquiries, the buyer's earlier enquiries on this listing become the first chat messages.
export async function getOrCreateConversation(listing, buyerId, { importEnquiries = false } = {}) {
  const key = { listingId: listing._id, buyerId };
  let conv = await Conversation.findOne(key);
  if (conv) return conv;
  try {
    conv = await Conversation.create({
      ...key,
      sellerId: listing.sellerId,
      listingTitle: listing.title,
      listingImage: listing.images?.[0] || ''
    });
  } catch (e) {
    if (e.code === 11000) return Conversation.findOne(key);
    throw e;
  }
  if (importEnquiries) {
    const old = await Enquiry.find({ listingId: listing._id, fromUserId: buyerId, sellerId: listing.sellerId }).sort({ createdAt: 1 }).limit(50);
    if (old.length) {
      await Message.insertMany(old.map(q => ({ conversationId: conv._id, senderId: buyerId, text: q.message, createdAt: q.createdAt })));
      const last = old[old.length - 1];
      await Conversation.updateOne({ _id: conv._id }, { $set: { lastMessage: last.message.slice(0, 120), lastMessageAt: last.createdAt, lastSenderId: buyerId } });
      conv = await Conversation.findById(conv._id);
    }
  }
  return conv;
}

// Save a message, bump the other person's unread counter, and send ONE notification
// when the recipient goes from "nothing unread" to "something unread" (so chats don't spam the bell).
export async function addMessage(conv, sender, text) {
  const fromBuyer = isBuyerOf(conv, sender._id);
  const unreadField = fromBuyer ? 'sellerUnread' : 'buyerUnread';
  const recipientId = fromBuyer ? conv.sellerId : conv.buyerId;
  const msg = await Message.create({ conversationId: conv._id, senderId: sender._id, text });
  const before = await Conversation.findOneAndUpdate(
    { _id: conv._id },
    { $set: { lastMessage: text.slice(0, 120), lastMessageAt: msg.createdAt, lastSenderId: sender._id }, $inc: { [unreadField]: 1 } },
    { new: false }
  );
  if (before && !before[unreadField]) {
    notify(recipientId, `New message from ${sender.name} about "${conv.listingTitle || 'a listing'}".`, `/chat/${conv._id}`);
  }
  return msg;
}
