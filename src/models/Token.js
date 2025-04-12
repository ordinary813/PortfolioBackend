import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    required: true,
  },
  expiresAt: {
    type: Date,
  },
  used: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model('Token', tokenSchema);