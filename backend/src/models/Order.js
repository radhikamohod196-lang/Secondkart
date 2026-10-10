import mongoose from 'mongoose';

export const ORDER_FLOW = ['Pending', 'Confirmed', 'Shipped', 'Delivered'];
export const DELIVERY_METHODS = ['Courier (demo)', 'Local pickup'];

const schema = new mongoose.Schema({
  ref: { type: String, required: true, unique: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Snapshot of the listing at purchase time so history stays correct if the listing changes or is deleted.
  title: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, default: '' },
  fullName: { type: String, required: true, trim: true, maxlength: 80 },
  phone: { type: String, required: true },
  deliveryMethod: { type: String, enum: DELIVERY_METHODS, required: true },
  address: { type: String, default: '', maxlength: 300 },
  status: { type: String, enum: [...ORDER_FLOW, 'Cancelled'], default: 'Pending' },
  reviewed: { type: Boolean, default: false },
  rating: { type: Number, min: 1, max: 5, default: null }
}, { timestamps: true });

schema.index({ buyerId: 1, createdAt: -1 });
schema.index({ sellerId: 1, createdAt: -1 });

export default mongoose.model('Order', schema);
