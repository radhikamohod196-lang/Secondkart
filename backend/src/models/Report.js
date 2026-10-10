import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true, trim: true, minlength: 5, maxlength: 500 }
}, { timestamps: true });

// One report per user per listing.
schema.index({ listingId: 1, reportedBy: 1 }, { unique: true });

export default mongoose.model('Report', schema);
