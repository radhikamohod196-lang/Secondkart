import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, required: true, maxlength: 300 },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false }
}, { timestamps: true });

schema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Notification', schema);
