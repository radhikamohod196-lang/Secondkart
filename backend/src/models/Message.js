import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 }
}, { timestamps: true });

schema.index({ conversationId: 1, _id: 1 });

export default mongoose.model('Message', schema);
