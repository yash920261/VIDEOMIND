const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  videoId: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: 'Untitled Video',
  },
  channel: {
    type: String,
    default: 'Unknown Channel',
  },
  thumbnail: String,
  duration: String,
  description: String,
  transcriptStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  transcriptLanguage: {
    type: String,
    default: 'en',
  },
  totalChunks: {
    type: Number,
    default: 0,
  },
  summary: {
    short: String,
    detailed: String,
    bullets: [String],
  },
  notes: String,
  quiz: [{
    question: String,
    options: [String],
    correctAnswer: Number,
    explanation: String,
  }],
}, {
  timestamps: true,
});

// Compound unique index so a user cannot add duplicate videos, but different users can add the same video.
videoSchema.index({ user: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model('Video', videoSchema);
