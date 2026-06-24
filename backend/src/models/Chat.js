const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
    index: true,
  },
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
  sources: [{
    text: String,
    startTime: Number,
    endTime: Number,
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Chat', chatSchema);
