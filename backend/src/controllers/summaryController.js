const Video = require('../models/Video');
const Chunk = require('../models/Chunk');
const { generateSummary } = require('../services/aiService');

/**
 * GET /api/videos/:id/summary — Generate or return cached summary
 */
exports.getSummary = async (req, res, next) => {
  try {
    const video = await Video.findOne({ _id: req.params.id, user: req.user._id });
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (video.transcriptStatus === 'failed') {
      return res.status(400).json({ message: 'Video processing failed. Please delete and try again.' });
    }
    if (video.transcriptStatus !== 'completed') {
      return res.status(400).json({ message: 'Video is still being processed' });
    }

    // Return cached summary if available
    if (video.summary && video.summary.short) {
      return res.json({ summary: video.summary });
    }

    // Generate new summary
    const chunks = await Chunk.find({ videoId: video._id })
      .sort({ chunkIndex: 1 })
      .select('text')
      .lean();

    const fullTranscript = chunks.map(c => c.text).join(' ');
    const summary = await generateSummary(fullTranscript, video.title);

    // Cache the summary
    video.summary = summary;
    await video.save();

    res.json({ summary });
  } catch (error) {
    next(error);
  }
};
