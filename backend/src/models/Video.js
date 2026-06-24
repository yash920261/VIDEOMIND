const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  videoId: {
    type: String,
    required: true,
    unique: true,
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

module.exports = mongoose.model('Video', videoSchema);
