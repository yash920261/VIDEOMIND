const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
    index: true,
  },
  text: {
    type: String,
    required: true,
  },
  embedding: {
    type: [Number],
    required: true,
  },
  startTime: {
    type: Number,
    required: true,
  },
  endTime: {
    type: Number,
    required: true,
  },
  chunkIndex: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

// Index for vector search (must be created in Atlas UI or via Atlas Admin API)
// This is a placeholder — the actual vector search index is created in MongoDB Atlas
chunkSchema.index({ videoId: 1, chunkIndex: 1 });

module.exports = mongoose.model('Chunk', chunkSchema);
