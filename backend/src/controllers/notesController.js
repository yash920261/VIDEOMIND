const Video = require('../models/Video');
const Chunk = require('../models/Chunk');
const { generateNotes } = require('../services/aiService');

/**
 * GET /api/videos/:id/notes — Generate or return cached notes
 */
exports.getNotes = async (req, res, next) => {
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

    // Return cached notes if available
    if (video.notes) {
      return res.json({ notes: video.notes });
    }

    // Generate new notes
    const chunks = await Chunk.find({ videoId: video._id })
      .sort({ chunkIndex: 1 })
      .select('text')
      .lean();

    const fullTranscript = chunks.map(c => c.text).join(' ');
    const notes = await generateNotes(fullTranscript, video.title);

    // Cache the notes
    video.notes = notes;
    await video.save();

    res.json({ notes });
  } catch (error) {
    next(error);
  }
};
