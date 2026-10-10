import mongoose from 'mongoose';

// One conversation per (listing, buyer). The seller of the listing is the other participant.
const schema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Snapshot so the chat still reads correctly if the listing is later deleted.
  listingTitle: { type: String, default: '' },
  listingImage: { type: String, default: '' },
  lastMessage: { type: String, default: '' },
  lastMessageAt: { type: Date, default: null },
  lastSenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  buyerUnread: { type: Number, default: 0 },
  sellerUnread: { type: Number, default: 0 }
}, { timestamps: true });

schema.index({ listingId: 1, buyerId: 1 }, { unique: true });

export default mongoose.model('Conversation', schema);
