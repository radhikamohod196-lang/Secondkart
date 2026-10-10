import mongoose from 'mongoose';

// A short-lived sign-in / sign-up challenge. Only a bcrypt hash of the code is stored.
const schema = new mongoose.Schema({
  challengeId: { type: String, required: true, unique: true },
  purpose: { type: String, enum: ['login', 'register'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // For registration the account is created only after the code is verified.
  pending: {
    name: String, email: String, phone: String, role: String, passwordHash: String
  },
  email: { type: String, required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } } // MongoDB TTL cleanup
});

export default mongoose.model('Otp', schema);
